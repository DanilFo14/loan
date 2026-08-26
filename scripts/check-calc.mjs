import { annuityPayment, calculateMortgage } from '../src/lib/calc.js'

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

const payment = annuityPayment(3_000_000, 7.5, 240)
console.log('annuity', payment)
assert(payment > 24_000 && payment < 25_000, 'annuity should be ~24156')

const base = calculateMortgage({
  amount: 3_000_000,
  rate: 7.5,
  years: 20,
  startDate: '2026-06-01',
  extras: [],
})

assert(base.base.months === 240, `expected 240 months, got ${base.base.months}`)
assert(base.base.rows.at(-1).remaining === 0, 'base must be paid off')
assert(Math.abs(base.base.initialPayment - payment) < 0.01, 'schedule payment mismatch')

const t0 = performance.now()
const withTerm = calculateMortgage({
  amount: 3_000_000,
  rate: 7.5,
  years: 20,
  startDate: '2026-06-01',
  extras: [{ id: '1', date: '2026-12-01', amount: 100_000, type: 'term' }],
})
const termMs = performance.now() - t0

assert(withTerm.extra.months < 240, 'term extra must shorten the loan')
assert(withTerm.savings > 0, 'term extra must save interest')
assert(Math.abs(withTerm.extra.payment - withTerm.base.initialPayment) < 0.01, 'term extra keeps payment')
assert(
  withTerm.extra.rows.find((row) => row.date === '2026-12-01')?.hasExtra,
  'December 2026 must be marked as extra',
)

const withPayment = calculateMortgage({
  amount: 3_000_000,
  rate: 7.5,
  years: 20,
  startDate: '2026-06-01',
  extras: [{ id: '2', date: '2026-12-01', amount: 100_000, type: 'payment' }],
})

assert(withPayment.extra.payment < withPayment.base.initialPayment, 'payment extra must reduce installment')
assert(withPayment.savings > 0, 'payment extra must save interest')

const heavy = calculateMortgage({
  amount: 12_000_000,
  rate: 16.5,
  years: 30,
  startDate: '2026-06-01',
  extras: Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    date: `202${7 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
    amount: 50_000,
    type: i % 2 ? 'payment' : 'term',
  })),
})
assert(heavy.extra.rows.length <= 360, 'must stay within 30 years')
assert(termMs < 50, `calc took ${termMs.toFixed(2)} ms`)

console.log('term months', withTerm.extra.months, 'savings', withTerm.savings)
console.log('new payment', withPayment.extra.payment)
console.log('ok', termMs.toFixed(2), 'ms')
