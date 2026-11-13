import { bankSnapshot } from '../data/earlyPayments.js'

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

function daysBetween(fromIso, toIso) {
  const [y1, m1, d1] = fromIso.split('-').map(Number)
  const [y2, m2, d2] = toIso.split('-').map(Number)
  const a = Date.UTC(y1, m1 - 1, d1)
  const b = Date.UTC(y2, m2 - 1, d2)
  return Math.round((b - a) / 86400000)
}

function yearDays(isoDate) {
  const year = Number(isoDate.slice(0, 4))
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return leap ? 366 : 365
}

function accrueInterest(remaining, annualPercent, fromIso, toIso) {
  const days = daysBetween(fromIso, toIso)
  if (days <= 0 || remaining <= EPS) return 0
  return remaining * (Number(annualPercent) / 100) * days / yearDays(toIso)
}

function applyTermRecalc({ extra, remaining, payment, month, termEndMonth, rate }) {
  if (remaining <= EPS) return { payment, termEndMonth }
  if (extra.type === 'payment') {
    const monthsLeft = Math.max(1, termEndMonth - month)
    const next = annuityPayment(remaining, rate, monthsLeft)
    return { payment: next, termEndMonth }
  }
  const newMonths = monthsToPayOff(remaining, payment, rate)
  if (Number.isFinite(newMonths)) {
    return { payment, termEndMonth: month + newMonths }
  }
  return { payment, termEndMonth }
}

function matchesBankLoan(startDate) {
  return Boolean(bankSnapshot?.startDate) && bankSnapshot.startDate === startDate
}

function scheduledRegular(date, defaultPayment, useBankSnapshot, startDate) {
  if (!useBankSnapshot || !matchesBankLoan(startDate)) return defaultPayment
  const overrides = bankSnapshot.regularOverrides || {}
  if (Object.prototype.hasOwnProperty.call(overrides, date)) {
    return Number(overrides[date]) || 0
  }
  if (bankSnapshot.firstRegularDate && date < bankSnapshot.firstRegularDate) return 0
  return Number(bankSnapshot.regularPayment) || defaultPayment
}

function calendarMonthsInclusive(fromIso, toIso) {
  const [y1, m1] = fromIso.split('-').map(Number)
  const [y2, m2] = toIso.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1) + 1
}

function buildBankRemainingRows({ remaining, fromDate, startMonth, payment }) {
  const n = Number(bankSnapshot.remainingPayments) || 0
  if (n <= 0 || remaining <= EPS) return []

  const regular = Number(bankSnapshot.regularPayment) || payment
  const lastPay = Number(bankSnapshot.lastPayment) || regular
  const pays = Array.from({ length: n }, (_, i) => (i === n - 1 ? lastPay : regular))
  const totalPay = pays.reduce((sum, value) => sum + value, 0)
  const principalStart = remaining
  const rows = []
  let rem = remaining

  for (let i = 0; i < n; i += 1) {
    const date = addMonths(fromDate, i + 1)
    const pay = pays[i]
    const principalPart = i === n - 1 ? rem : round2((principalStart * pay) / totalPay)
    const interest = round2(pay - principalPart)
    rem = round2(rem - principalPart)
    if (i === n - 1 || rem < EPS) rem = 0
    rows.push({
      month: startMonth + i + 1,
      date,
      payment: pay,
      regular: pay,
      extra: 0,
      principal: principalPart,
      interest,
      remaining: rem,
      hasExtra: false,
      extraTypes: [],
      paymentAfter: regular,
    })
  }

  return rows
}

function applyBankTotals(schedule, paid, plannedMonths, startDate, principal) {
  if (!matchesBankLoan(startDate) || !bankSnapshot) return
  const elapsed = calendarMonthsInclusive(startDate, bankSnapshot.asOf)
  const remainingPayments = Number(bankSnapshot.remainingPayments) || 0
  schedule.payment = Number(bankSnapshot.regularPayment) || schedule.payment
  schedule.totalPaid = Number(bankSnapshot.totalToPay) || schedule.totalPaid
  schedule.totalInterest = round2(schedule.totalPaid - principal)
  schedule.endDate = bankSnapshot.lastPaymentDate || schedule.endDate
  schedule.months = elapsed + remainingPayments
  paid.spent = Number(bankSnapshot.alreadyPaid) || paid.spent
  paid.remaining = round2(bankSnapshot.remaining)
  paid.paidMonths = elapsed
  paid.monthsClosedByExtra = Math.max(0, plannedMonths - remainingPayments - elapsed)
}

function buildSchedule({ amount, rate, startDate, extras, plannedMonths, useBankSnapshot = false }) {
  const rows = []
  const bankLoan = useBankSnapshot && matchesBankLoan(startDate)
  let remaining = round2(amount)
  let payment = bankLoan && bankSnapshot.regularPayment
    ? Number(bankSnapshot.regularPayment)
    : annuityPayment(amount, rate, plannedMonths)
  let termEndMonth = plannedMonths
  let totalPaid = 0
  let totalInterest = 0
  let lastRegularPayment = payment
  let accrued = 0
  let cursor = bankLoan ? startDate : addMonths(startDate, -1)

  const sortedExtras = [...extras]
    .filter((item) => item.date && Number(item.amount) > 0)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))

  let extraIndex = 0

  const takeExtrasOn = (date, month) => {
    let extraTotal = 0
    let extraInterest = 0
    const extraTypes = []

    while (extraIndex < sortedExtras.length && sortedExtras[extraIndex].date === date) {
      const extra = sortedExtras[extraIndex]
      extraIndex += 1
      if (remaining <= EPS && accrued <= EPS) break

      accrued = round2(accrued)
      const interestTaken = round2(Math.min(Number(extra.amount), accrued))
      accrued = round2(accrued - interestTaken)
      const toPrincipal = round2(Math.min(Number(extra.amount) - interestTaken, remaining))
      remaining = round2(remaining - toPrincipal)
      extraTotal = round2(extraTotal + Number(extra.amount))
      extraInterest = round2(extraInterest + interestTaken)
      extraTypes.push(extra.type)

      const recalc = applyTermRecalc({
        extra,
        remaining,
        payment,
        month,
        termEndMonth,
        rate,
      })
      payment = recalc.payment
      lastRegularPayment = recalc.payment
      termEndMonth = recalc.termEndMonth
    }

    return { extraTotal, extraInterest, extraTypes }
  }

  const pushExtraOnlyRow = (extraDate, skipped, monthHint) => {
    if (skipped.extraTotal <= EPS) return
    rows.push({
      month: monthHint,
      date: extraDate,
      payment: skipped.extraTotal,
      regular: 0,
      extra: skipped.extraTotal,
      principal: round2(skipped.extraTotal - skipped.extraInterest),
      interest: skipped.extraInterest,
      remaining,
      hasExtra: true,
      extraTypes: [...skipped.extraTypes],
      paymentAfter: payment,
    })
    totalPaid = round2(totalPaid + skipped.extraTotal)
    totalInterest = round2(totalInterest + skipped.extraInterest)
  }

  for (let month = 1; month <= MAX_MONTHS && (remaining > EPS || accrued > EPS); month += 1) {
    const date = addMonths(startDate, month - 1)

    while (extraIndex < sortedExtras.length && sortedExtras[extraIndex].date < date) {
      const extraDate = sortedExtras[extraIndex].date
      accrued = round2(accrued + accrueInterest(remaining, rate, cursor, extraDate))
      cursor = extraDate
      const skipped = takeExtrasOn(extraDate, calendarMonthsInclusive(startDate, extraDate))
      pushExtraOnlyRow(extraDate, skipped, calendarMonthsInclusive(startDate, extraDate))
    }

    accrued = round2(accrued + accrueInterest(remaining, rate, cursor, date))
    cursor = date

    const scheduled = scheduledRegular(date, payment, useBankSnapshot, startDate)

    if (scheduled <= EPS) {
      const sameDay = takeExtrasOn(date, month)
      if (sameDay.extraTotal <= EPS) continue

      if (remaining < 0) remaining = 0
      if (remaining <= EPS) remaining = 0

      rows.push({
        month,
        date,
        payment: sameDay.extraTotal,
        regular: 0,
        extra: sameDay.extraTotal,
        principal: round2(sameDay.extraTotal - sameDay.extraInterest),
        interest: sameDay.extraInterest,
        remaining,
        hasExtra: true,
        extraTypes: [...sameDay.extraTypes],
        paymentAfter: payment,
      })
      totalPaid = round2(totalPaid + sameDay.extraTotal)
      totalInterest = round2(totalInterest + sameDay.extraInterest)
    } else {
      const interest = round2(accrued)
      let regular = scheduled
      let principalPart = 0
      let interestPaid = 0

      if (remaining + interest <= scheduled + EPS) {
        regular = round2(remaining + interest)
        principalPart = remaining
        interestPaid = interest
        accrued = 0
      } else if (scheduled + EPS < interest) {
        regular = scheduled
        principalPart = 0
        interestPaid = scheduled
        accrued = round2(interest - scheduled)
      } else {
        regular = scheduled
        principalPart = round2(regular - interest)
        if (principalPart > remaining) {
          principalPart = remaining
          regular = round2(principalPart + interest)
        }
        interestPaid = round2(regular - principalPart)
        accrued = 0
      }

      remaining = round2(remaining - principalPart)

      const sameDay = takeExtrasOn(date, month)
      const extraTotal = sameDay.extraTotal
      const extraInterest = sameDay.extraInterest
      const extraTypes = [...sameDay.extraTypes]

      if (remaining < 0) remaining = 0
      if (remaining <= EPS) remaining = 0

      const totalThisMonth = round2(regular + extraTotal)
      const body = round2(principalPart + extraTotal - extraInterest)
      totalPaid = round2(totalPaid + totalThisMonth)
      totalInterest = round2(totalInterest + interestPaid + extraInterest)

      rows.push({
        month,
        date,
        payment: totalThisMonth,
        regular,
        extra: extraTotal,
        principal: body,
        interest: round2(interestPaid + extraInterest),
        remaining,
        hasExtra: extraTotal > 0,
        extraTypes,
        paymentAfter: payment,
      })
    }

    if (
      bankLoan &&
      bankSnapshot?.asOf === date &&
      Number(bankSnapshot.remaining) >= 0
    ) {
      remaining = round2(bankSnapshot.remaining)
      accrued = 0
      rows[rows.length - 1].remaining = remaining
      lastRegularPayment = Number(bankSnapshot.regularPayment) || lastRegularPayment
      payment = lastRegularPayment
      const future = buildBankRemainingRows({
        remaining,
        fromDate: date,
        startMonth: month,
        payment,
      })
      for (const row of future) {
        rows.push(row)
        totalPaid = round2(totalPaid + row.payment)
        totalInterest = round2(totalInterest + row.interest)
      }
      remaining = 0
      break
    }
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
    useBankSnapshot: true,
  })

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
        useBankSnapshot: true,
      })
    : base
  paid.monthsClosedByExtra = Math.max(0, plannedMonths - afterPaidExtras.months)
  applyBankTotals(withExtras, paid, plannedMonths, startDate, principal)
  const forecast = buildForecast(withExtras.rows, annualRate, today)

  const savings = round2(base.totalInterest - withExtras.totalInterest)
  const overpayPct = principal > 0 ? (base.totalInterest / principal) * 100 : 0
  const extraOverpayPct = principal > 0 ? (withExtras.totalInterest / principal) * 100 : 0

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
    paymentChanged:
      hasExtras &&
      !matchesBankLoan(startDate) &&
      Math.abs(withExtras.payment - base.payment) > 0.01,
    termChanged: hasExtras && withExtras.months !== base.months,
  }
}
