<script setup>
import { computed, ref, watch } from 'vue'
import LoanParams from './components/LoanParams.vue'
import EarlyPayments from './components/EarlyPayments.vue'
import Results from './components/Results.vue'
import DebtChart from './components/DebtChart.vue'
import ScheduleTable from './components/ScheduleTable.vue'
import { addMonths, calculateMortgage } from './lib/calc.js'
import { defaultState, loadState, saveState } from './lib/storage.js'

const state = ref(loadState())

watch(state, (value) => saveState(value), { deep: true })

const result = computed(() =>
  calculateMortgage({
    amount: state.value.amount,
    rate: state.value.rate,
    years: state.value.years,
    startDate: state.value.startDate,
    extras: state.value.extras,
  }),
)

function addExtra() {
  const last = state.value.extras.at(-1)
  const date = last?.date || addMonths(state.value.startDate, 6)
  state.value.extras.push({
    id: crypto.randomUUID(),
    date,
    amount: 100_000,
    type: 'term',
  })
}

function removeExtra(id) {
  state.value.extras = state.value.extras.filter((item) => item.id !== id)
}

function updateExtra(id, patch) {
  const item = state.value.extras.find((extra) => extra.id === id)
  if (item) Object.assign(item, patch)
}

function reset() {
  const next = defaultState()
  state.value = next
  saveState(next)
}
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <p class="eyebrow">Семейный расчёт</p>
      <h1>Ипотечный калькулятор</h1>
      <p class="lede">
        Считаем аннуитет и показываем, как досрочные платежи сокращают срок,
        ежемесячный взнос и переплату банку.
      </p>
    </header>

    <div class="layout">
      <div class="stack">
        <LoanParams
          v-model:amount="state.amount"
          v-model:rate="state.rate"
          v-model:years="state.years"
          v-model:startDate="state.startDate"
        />
        <EarlyPayments
          :extras="state.extras"
          @add="addExtra"
          @remove="removeExtra"
          @update="updateExtra"
        />
        <div class="toolbar">
          <button type="button" class="btn-ghost" @click="reset">Сбросить</button>
        </div>
      </div>

      <div class="stack">
        <Results :result="result" />
        <DebtChart
          v-if="result"
          :base-rows="result.base.rows"
          :extra-rows="result.extra.rows"
          :principal="result.principal"
        />
        <p v-else class="panel hint">Введите сумму кредита и срок, чтобы увидеть расчёт.</p>
      </div>
    </div>

    <ScheduleTable v-if="result" :rows="result.extra.rows" />
  </div>
</template>
