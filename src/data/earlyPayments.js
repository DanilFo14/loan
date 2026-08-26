/**
 * Досрочные погашения.
 *
 * date   — дата платежа, формат YYYY-MM-DD
 * amount — сумма в рублях
 * type   — 'term' уменьшает срок (платёж тот же)
 *          'payment' уменьшает ежемесячный платёж (срок тот же)
 */
export const earlyPayments = [
  { date: '2026-05-18', amount: 15000, type: 'term' },
  { date: '2026-06-13', amount: 150000, type: 'term' },
  { date: '2026-07-13', amount: 170000, type: 'term' },
  { date: '2026-08-13', amount: 260000, type: 'term' },
]

export function seededExtras() {
  return earlyPayments.map((item, index) => ({
    id: `hardcoded-${index + 1}`,
    date: item.date,
    amount: Number(item.amount) || 0,
    type: item.type === 'payment' ? 'payment' : 'term',
  }))
}
