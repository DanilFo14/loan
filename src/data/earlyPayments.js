/**
 * Досрочные погашения — как в выписке банка.
 *
 * date   — дата платежа, формат YYYY-MM-DD
 * amount — сумма в рублях
 * type   — 'term' уменьшает срок (платёж тот же)
 *          'payment' уменьшает ежемесячный платёж (срок тот же)
 */
export const earlyPayments = [
  { date: '2026-05-18', amount: 25_000, type: 'term' },
  { date: '2026-06-13', amount: 50_000, type: 'term' },
  { date: '2026-06-13', amount: 70_000, type: 'term' },
  { date: '2026-06-13', amount: 30_000, type: 'term' },
  { date: '2026-07-13', amount: 90_000, type: 'term' },
  { date: '2026-07-13', amount: 50_000, type: 'term' },
  { date: '2026-07-13', amount: 30_000, type: 'term' },
  { date: '2026-08-13', amount: 180_000, type: 'term' },
  { date: '2026-08-13', amount: 50_000, type: 'term' },
  { date: '2026-08-13', amount: 30_000, type: 'term' },
  { date: '2026-09-13', amount: 50_000, type: 'term' },
  { date: '2026-09-13', amount: 30_000, type: 'term' },
  { date: '2026-09-13', amount: 36_000, type: 'term' },
  { date: '2026-09-14', amount: 5_000, type: 'term' },
  { date: '2026-09-18', amount: 41_674, type: 'term' },
  { date: '2026-10-13', amount: 60_000, type: 'term' },
  { date: '2026-10-13', amount: 60_000, type: 'term' },
  { date: '2026-10-13', amount: 30_000, type: 'term' },
  { date: '2026-11-12', amount: 46_674, type: 'term' },
  { date: '2026-11-13', amount: 120_000, type: 'term' },
  { date: '2026-11-13', amount: 30_000, type: 'term' },
]

/** Выписка банка: обязательный платёж, уже выплаченное и остаток после 13.11.2026. */
export const bankSnapshot = {
  startDate: '2026-05-13',
  asOf: '2026-11-13',
  remaining: 1_916_770.1,
  regularPayment: 46_674,
  firstRegularDate: '2026-06-13',
  regularOverrides: {
    '2026-06-13': 21_674,
    '2026-10-13': 0,
    '2026-11-13': 0,
  },
  alreadyPaid: 1_276_044,
  remainingToPay: 2_882_285.17,
  totalToPay: 4_158_329.17,
  remainingPayments: 62,
  lastPayment: 35_171.17,
  lastPaymentDate: '2032-01-13',
}

export function seededExtras() {
  return earlyPayments.map((item, index) => ({
    id: `hardcoded-${index + 1}`,
    date: item.date,
    amount: Number(item.amount) || 0,
    type: item.type === 'payment' ? 'payment' : 'term',
  }))
}
