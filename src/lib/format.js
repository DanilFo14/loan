const moneyFmt = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const moneyIntFmt = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
})

const percentFmt = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export function formatMoney(value, { integer = false } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const formatted = integer ? moneyIntFmt.format(Math.round(n)) : moneyFmt.format(n)
  return `${formatted} ₽`
}

export function formatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${percentFmt.format(n)}%`
}

export function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`
}

export function formatTerm(months) {
  if (!Number.isFinite(months) || months < 0) return '—'
  const years = Math.floor(months / 12)
  const rest = months % 12
  const yearLabel = plural(years, 'год', 'года', 'лет')
  const monthLabel = plural(rest, 'месяц', 'месяца', 'месяцев')
  if (years === 0) return `${rest} ${monthLabel}`
  if (rest === 0) return `${years} ${yearLabel}`
  return `${years} ${yearLabel} ${rest} ${monthLabel}`
}

export function plural(n, one, few, many) {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

export function parseThousands(raw) {
  const digits = String(raw).replace(/[^\d]/g, '')
  if (!digits) return 0
  return Number(digits)
}

export function formatThousands(value) {
  if (value === '' || value == null) return ''
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return value === 0 ? '0' : ''
  return moneyIntFmt.format(n)
}

export function parseDecimal(raw) {
  const normalized = String(raw).replace(',', '.').replace(/[^\d.]/g, '')
  if (!normalized) return 0
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}
