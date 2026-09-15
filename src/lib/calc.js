const MAX_MONTHS = 400
const EPS = 0.005

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}

export function monthlyRate(annualPercent) {
  return Number(annualPercent) / 100 / 12
}

export function addMonths(isoDate, monthsToAdd) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const cursor = new Date(year, month - 1 + monthsToAdd, 1)
  const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  cursor.setDate(Math.min(day || 1, lastDay))
  const y = cursor.getFullYear()
  const m = String(cursor.getMonth() + 1).padStart(2, '0')
  const d = String(cursor.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function annuityPayment(principal, annualPercent, months) {
  if (principal <= 0 || months <= 0) return 0
  const r = monthlyRate(annualPercent)
  if (r === 0) return round2(principal / months)
  const pow = (1 + r) ** months
  return round2((principal * (r * pow)) / (pow - 1))
}

export function monthsToPayOff(principal, payment, annualPercent) {
  if (principal <= EPS) return 0
  if (payment <= EPS) return Number.POSITIVE_INFINITY
  const r = monthlyRate(annualPercent)
  if (r === 0) return Math.ceil(principal / payment)
  const interestOnly = principal * r
  if (payment <= interestOnly + 0.0001) return Number.POSITIVE_INFINITY
  const n = Math.log(payment / (payment - principal * r)) / Math.log(1 + r)
  return Math.max(1, Math.ceil(n - 1e-9))
}

function ym(isoDate) {
  return isoDate.slice(0, 7)
}

function extrasForMonth(extras, paymentDate, isFirst) {
  const key = ym(paymentDate)
  return extras.filter((item) => {
    if (!item.date || !(item.amount > 0)) return false
    if (ym(item.date) === key) return true
    return isFirst && item.date < paymentDate
  })
}

function buildSchedule({ amount, rate, startDate, extras, plannedMonths }) {
  const rows = []
  let remaining = round2(amount)
  let payment = annuityPayment(amount, rate, plannedMonths)
  let termEndMonth = plannedMonths
  let totalPaid = 0
  let totalInterest = 0
  let lastRegularPayment = payment

  const sortedExtras = [...extras]
    .filter((item) => item.date && Number(item.amount) > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))

  for (let month = 1; month <= MAX_MONTHS && remaining > EPS; month += 1) {
    const date = addMonths(startDate, month - 1)
    const interest = round2(remaining * monthlyRate(rate))

    let regular = payment
    if (remaining + interest <= payment + EPS) {
      regular = round2(remaining + interest)
    }

    let principalPart = round2(regular - interest)
    if (principalPart > remaining) {
      principalPart = remaining
      regular = round2(principalPart + interest)
    }
    if (principalPart < 0) {
      principalPart = 0
      regular = interest
    }

    remaining = round2(remaining - principalPart)

    const monthExtras = extrasForMonth(sortedExtras, date, month === 1)
    let extraTotal = 0
    const extraTypes = []

    for (const extra of monthExtras) {
      if (remaining <= EPS) break
      const applied = round2(Math.min(Number(extra.amount), remaining))
      remaining = round2(remaining - applied)
      extraTotal = round2(extraTotal + applied)
      extraTypes.push(extra.type)

      if (remaining > EPS) {
        if (extra.type === 'payment') {
          const monthsLeft = Math.max(1, termEndMonth - month)
          payment = annuityPayment(remaining, rate, monthsLeft)
          lastRegularPayment = payment
        } else {
          const newMonths = monthsToPayOff(remaining, payment, rate)
          if (Number.isFinite(newMonths)) {
            termEndMonth = month + newMonths
          }
        }
      }
    }

    if (remaining < 0) remaining = 0
    if (remaining <= EPS) remaining = 0

    const totalThisMonth = round2(regular + extraTotal)
    const body = round2(principalPart + extraTotal)
    totalPaid = round2(totalPaid + totalThisMonth)
    totalInterest = round2(totalInterest + interest)

    rows.push({
      month,
      date,
      payment: totalThisMonth,
      regular,
      extra: extraTotal,
      principal: body,
      interest,
      remaining,
      hasExtra: extraTotal > 0,
      extraTypes,
      paymentAfter: payment,
    })
  }

  return {
    rows,
    payment: lastRegularPayment,
    initialPayment: annuityPayment(amount, rate, plannedMonths),
    months: rows.length,
    endDate: rows.at(-1)?.date ?? startDate,
    totalPaid,
    totalInterest,
  }
}

function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return sorted[mid]
  return round2((sorted[mid - 1] + sorted[mid]) / 2)
}

function forecastPayoff({ remaining, rate, payment, medianExtra, lastPaidDate }) {
  if (remaining <= EPS) {
    return {
      possible: true,
      alreadyPaidOff: true,
      extraMonths: 0,
      endDate: lastPaidDate,
      medianExtra,
    }
  }

  const r = monthlyRate(rate)
  if (payment + medianExtra <= remaining * r + 0.0001) {
    return {
      possible: false,
      alreadyPaidOff: false,
      extraMonths: Number.POSITIVE_INFINITY,
      endDate: null,
      medianExtra,
    }
  }

  let left = remaining
  let months = 0
  let date = lastPaidDate

  while (left > EPS && months < MAX_MONTHS) {
    months += 1
    date = addMonths(lastPaidDate, months)
    const interest = round2(left * r)

    let regular = payment
    if (left + interest <= payment + EPS) {
      left = 0
      break
    }

    let principalPart = round2(regular - interest)
    if (principalPart > left) {
      principalPart = left
    }
    left = round2(left - principalPart)

    if (left > EPS && medianExtra > 0) {
      const extra = round2(Math.min(medianExtra, left))
      left = round2(left - extra)
    }
    if (left < 0 || left <= EPS) left = 0
  }

  return {
    possible: left <= EPS,
    alreadyPaidOff: false,
    extraMonths: months,
    endDate: date,
    medianExtra,
  }
}

function buildForecast(rows, rate, today) {
  const paid = rows.filter((row) => row.date <= today)
  if (!paid.length) return null

  const extras = paid.filter((row) => row.extra > 0).map((row) => row.extra)
  const totals = paid.map((row) => row.payment)
  const medianExtra = median(extras)
  const medianTotal = median(totals)
  const last = paid.at(-1)
  const remaining = last.remaining
  const payment = last.paymentAfter ?? last.regular

  return {
    medianExtra,
    medianTotal,
    sampleSize: extras.length,
    paidMonths: paid.length,
    remaining,
    ...forecastPayoff({
      remaining,
      rate,
      payment,
      medianExtra,
      lastPaidDate: last.date,
    }),
  }
}

function summarizePaid(rows, principal, today) {
  const paid = rows.filter((row) => row.date <= today)
  const spent = round2(paid.reduce((sum, row) => sum + row.payment, 0))
  const spentExtra = round2(paid.reduce((sum, row) => sum + row.extra, 0))
  const last = paid.at(-1)
  return {
    spent,
    spentExtra,
    paidMonths: paid.length,
    remaining: last ? last.remaining : principal,
    lastDate: last?.date ?? null,
  }
}

export function calculateMortgage({
  amount,
  rate,
  years,
  startDate,
  extras = [],
}) {
  const principal = Number(amount) || 0
  const annualRate = Number(rate) || 0
  const termYears = Number(years) || 0
  const plannedMonths = Math.round(termYears * 12)

  if (principal <= 0 || plannedMonths <= 0 || !startDate) {
    return null
  }

  const base = buildSchedule({
    amount: principal,
    rate: annualRate,
    startDate,
    extras: [],
    plannedMonths,
  })

  const withExtras = buildSchedule({
    amount: principal,
    rate: annualRate,
    startDate,
    extras,
    plannedMonths,
  })

  const savings = round2(base.totalInterest - withExtras.totalInterest)
  const overpayPct = principal > 0 ? (base.totalInterest / principal) * 100 : 0
  const extraOverpayPct = principal > 0 ? (withExtras.totalInterest / principal) * 100 : 0
  const today = todayIso()
  const hasExtras = extras.some((item) => item.date && Number(item.amount) > 0)
  const paid = summarizePaid(withExtras.rows, principal, today)
  const paidExtras = extras.filter(
    (item) => item.date && item.date <= today && Number(item.amount) > 0,
  )
  const afterPaidExtras = paidExtras.length
    ? buildSchedule({
        amount: principal,
        rate: annualRate,
        startDate,
        extras: paidExtras,
        plannedMonths,
      })
    : base
  paid.monthsClosedByExtra = Math.max(0, plannedMonths - afterPaidExtras.months)
  const forecast = buildForecast(withExtras.rows, annualRate, today)

  return {
    principal,
    plannedMonths,
    startDate,
    hasExtras,
    base: {
      ...base,
      overpayPercent: overpayPct,
    },
    extra: {
      ...withExtras,
      overpayPercent: extraOverpayPct,
    },
    paid,
    forecast,
    savings,
    paymentChanged: hasExtras && Math.abs(withExtras.payment - base.payment) > 0.01,
    termChanged: hasExtras && withExtras.months !== base.months,
  }
}
