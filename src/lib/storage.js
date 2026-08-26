import { seededExtras } from '../data/earlyPayments.js'

const STORAGE_KEY = 'mortgage-calculator:v3'

export function defaultState() {
  return {
    amount: 2_977_900,
    rate: 16.9,
    years: 14,
    startDate: '2026-05-13',
    extras: seededExtras(),
  }
}

export function loadState() {
  if (typeof localStorage === 'undefined') return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    const defaults = defaultState()
    return {
      amount: Number(parsed.amount) > 0 ? Number(parsed.amount) : defaults.amount,
      rate: Number(parsed.rate) >= 0 ? Number(parsed.rate) : defaults.rate,
      years: Number(parsed.years) > 0 ? Number(parsed.years) : defaults.years,
      startDate: parsed.startDate || defaults.startDate,
      extras: mergeExtras(parsed.extras, defaults.startDate),
    }
  } catch {
    return defaultState()
  }
}

function mergeExtras(stored, fallbackDate) {
  const fromFile = seededExtras()
  const extraUi = Array.isArray(stored)
    ? stored
        .filter((item) => !String(item.id).startsWith('hardcoded-'))
        .map((item) => ({
          id: item.id || crypto.randomUUID(),
          date: item.date || fallbackDate,
          amount: Number(item.amount) || 0,
          type: item.type === 'payment' ? 'payment' : 'term',
        }))
    : []
  return [...fromFile, ...extraUi]
}

export function saveState(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        amount: state.amount,
        rate: state.rate,
        years: state.years,
        startDate: state.startDate,
        extras: state.extras,
      }),
    )
  } catch {
    // Quota or private mode — ignore, calculations still work in memory.
  }
}
