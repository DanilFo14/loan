<script setup>
import { computed, ref, watch } from 'vue'
import LoanParams from './components/LoanParams.vue'
import Results from './components/Results.vue'
import DebtChart from './components/DebtChart.vue'
import ScheduleTable from './components/ScheduleTable.vue'
import { calculateMortgage } from './lib/calc.js'
import { loadState, saveState } from './lib/storage.js'

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
