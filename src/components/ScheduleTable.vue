<script setup>
import { formatDate, formatMoney } from '../lib/format.js'

defineProps({
  rows: { type: Array, default: () => [] },
})

function typeLabel(types) {
  if (!types?.length) return 'досрочно'
  return [...new Set(types)]
    .map((type) => (type === 'payment' ? '↓ платёж' : '↓ срок'))
    .join(', ')
}
</script>

<template>
  <section class="panel">
    <header class="panel-head row">
      <div>
        <p class="eyebrow">График</p>
        <h2>Платежи по месяцам</h2>
      </div>
      <p class="hint">{{ rows.length }} {{ rows.length === 1 ? 'платёж' : 'платежей' }}</p>
    </header>

    <div class="table-scroll">
      <table class="schedule">
        <thead>
          <tr>
            <th>Месяц / дата</th>
            <th>Платёж</th>
            <th>Тело долга</th>
            <th>Проценты</th>
            <th>Остаток</th>
            <th>Досрочно</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.month" :class="{ extra: row.hasExtra }">
            <td>
              <strong>{{ row.month }}</strong>
              <span>{{ formatDate(row.date) }}</span>
            </td>
            <td>{{ formatMoney(row.payment) }}</td>
            <td>{{ formatMoney(row.principal) }}</td>
            <td>{{ formatMoney(row.interest) }}</td>
            <td>{{ formatMoney(row.remaining) }}</td>
            <td>
              <span v-if="row.hasExtra" class="badge">{{ typeLabel(row.extraTypes) }}</span>
              <span v-else class="muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
