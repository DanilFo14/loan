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
  const hasExtras = extras.some((item) => item.date && Number(item.amount) > 0)

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
    savings,
    paymentChanged: hasExtras && Math.abs(withExtras.payment - base.payment) > 0.01,
    termChanged: hasExtras && withExtras.months !== base.months,
  }
}
