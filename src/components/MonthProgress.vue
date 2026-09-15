<script setup>
import { computed } from 'vue'
import { plural } from '../lib/format.js'

const props = defineProps({
  result: { type: Object, required: true },
})

const summary = computed(() => {
  const total = props.result.plannedMonths || 0
  const paidCount = props.result.paid?.paidMonths || 0
  const extraClosed = Math.min(
    props.result.paid?.monthsClosedByExtra || 0,
    Math.max(0, total - paidCount),
  )
  return { total, paidCount, extraClosed, doneCount: paidCount + extraClosed }
})

const years = computed(() => {
  const { total, paidCount, extraClosed } = summary.value
  const cells = Array.from({ length: total }, (_, i) => {
    const month = i + 1
    let kind = 'empty'
    if (i < paidCount) kind = 'paid'
    else if (i < paidCount + extraClosed) kind = 'extra'
    return { month, kind }
  })

  const yearCount = Math.ceil(total / 12)
  return Array.from({ length: yearCount }, (_, year) => ({
    year: year + 1,
    cells: cells.slice(year * 12, year * 12 + 12),
  }))
})

function cellTitle(cell) {
  const labels = {
    paid: 'обязательный платёж',
    extra: 'закрыто досрочкой',
    empty: 'ещё предстоит',
  }
  return `${cell.month} мес. · ${labels[cell.kind]}`
}
</script>

<template>
  <section class="panel">
    <header class="panel-head row">
      <div>
        <p class="eyebrow">Прогресс</p>
        <h2>{{ summary.total }} {{ plural(summary.total, 'месяц', 'месяца', 'месяцев') }}</h2>
      </div>
      <p class="hint">{{ summary.doneCount }} из {{ summary.total }}</p>
    </header>

    <div class="month-grid" role="img" aria-label="Прогресс по месяцам кредита">
      <div v-for="group in years" :key="group.year" class="month-year">
        <span class="month-year-label">{{ group.year }}</span>
        <div class="month-year-cells">
          <i
            v-for="cell in group.cells"
            :key="cell.month"
            class="month-cell"
            :class="cell.kind"
            :title="cellTitle(cell)"
          />
        </div>
      </div>
    </div>

    <ul class="month-legend">
      <li><i class="month-cell paid" />обязательный платёж</li>
      <li><i class="month-cell extra" />закрыто досрочно</li>
      <li><i class="month-cell empty" />осталось</li>
    </ul>
  </section>
</template>
