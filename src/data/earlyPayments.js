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
]

/** Выписка банка: обязательный платёж, уже выплаченное и остаток после 13.10.2026. */
export const bankSnapshot = {
  startDate: '2026-05-13',
  asOf: '2026-10-13',
  remaining: 2_083_288,
  regularPayment: 46_674,
  firstRegularDate: '2026-06-13',
  regularOverrides: {
    '2026-06-13': 21_674,
    '2026-10-13': 0,
  },
  alreadyPaid: 1_079_370,
  remainingToPay: 3_327_124.54,
  totalToPay: 4_406_494.54,
  remainingPayments: 72,
  lastPayment: 13_270.54,
  lastPaymentDate: '2032-10-13',
}

export function seededExtras() {
  return earlyPayments.map((item, index) => ({
    id: `hardcoded-${index + 1}`,
    date: item.date,
    amount: Number(item.amount) || 0,
    type: item.type === 'payment' ? 'payment' : 'term',
  }))
}
