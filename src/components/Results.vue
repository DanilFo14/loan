<script setup>
import { formatDate, formatMoney, formatPercent, formatTerm, plural } from '../lib/format.js'

defineProps({
  result: { type: Object, default: null },
})
</script>

<template>
  <section v-if="result" class="space-y-4">
    <div
      class="banner-grid"
      :class="{ single: !(result.hasExtras && result.savings > 0) }"
    >
      <div class="save-banner">
        <p class="eyebrow">Уже выплачено</p>
        <p class="save-value">Вы потратили <span class="money-nowrap">{{ formatMoney(result.paid.spent, { integer: true }) }}</span></p>
        <p v-if="result.paid.paidMonths" class="hint">
          {{ result.paid.paidMonths }}
          {{ plural(result.paid.paidMonths, 'платёж', 'платежа', 'платежей') }}
          <template v-if="result.paid.spentExtra">
            · досрочно {{ formatMoney(result.paid.spentExtra, { integer: true }) }}
          </template>
          · остаток {{ formatMoney(result.paid.remaining, { integer: true }) }}
        </p>
        <p v-else class="hint">
          Выплаты ещё не начались, первый платёж {{ formatDate(result.startDate) }}
        </p>
      </div>

      <div v-if="result.hasExtras && result.savings > 0" class="save-banner">
        <p class="eyebrow">Выгода досрочного погашения</p>
        <p class="save-value">Вы сэкономили <span class="money-nowrap">{{ formatMoney(result.savings, { integer: true }) }}</span></p>
        <p class="hint">
          Переплата {{ formatMoney(result.base.totalInterest, { integer: true }) }}
          → {{ formatMoney(result.extra.totalInterest, { integer: true }) }}
        </p>
      </div>
    </div>

    <div v-if="result.forecast" class="save-banner">
      <p class="eyebrow">Прогноз по медиане</p>
      <p v-if="result.forecast.alreadyPaidOff" class="save-value">Ипотека уже закрыта</p>
      <p v-else-if="result.forecast.possible" class="save-value">
        Закроете {{ formatDate(result.forecast.endDate) }}
      </p>
      <p v-else class="save-value">При таком темпе кредит не закроется</p>
      <p class="hint">
        <template v-if="result.forecast.medianExtra">
          Медианная досрочка
          <span class="money-nowrap">{{ formatMoney(result.forecast.medianExtra, { integer: true }) }}</span>
          · медианный платёж за месяц
          <span class="money-nowrap">{{ formatMoney(result.forecast.medianTotal, { integer: true }) }}</span>
        </template>
        <template v-else>
          Пока нет досрочек — прогноз без дополнительных взносов
        </template>
        <template v-if="result.forecast.possible && result.forecast.extraMonths">
          · ещё {{ formatTerm(result.forecast.extraMonths) }}
        </template>
      </p>
    </div>
    <div v-if="result.hasExtras && result.savings <= 0" class="save-banner muted">
      <p class="hint">Досрочные платежи не уменьшили переплату — проверьте даты и суммы.</p>
    </div>

    <div class="compare-grid single">
      <article class="panel result-card accent">
        <header class="panel-head">
          <p class="eyebrow text-moss">С досрочным погашением</p>
          <h2>Новый график</h2>
        </header>
        <dl class="stats">
          <div>
            <dt>Ежемесячный платёж</dt>
            <dd>
              {{ formatMoney(result.extra.payment) }}
              <small v-if="result.paymentChanged">
                было {{ formatMoney(result.base.initialPayment) }}
              </small>
              <small v-else>не менялся — выбран тип «срок»</small>
            </dd>
          </div>
          <div>
            <dt>Новая переплата</dt>
            <dd>
              {{ formatMoney(result.extra.totalInterest, { integer: true }) }}
              <small>{{ formatPercent(result.extra.overpayPercent) }} от суммы кредита</small>
            </dd>
          </div>
          <div>
            <dt>Всего выплат</dt>
            <dd>{{ formatMoney(result.extra.totalPaid, { integer: true }) }}</dd>
          </div>
          <div>
            <dt>Новый срок / дата</dt>
            <dd>
              {{ formatTerm(result.extra.months) }}
              <small>полное погашение {{ formatDate(result.extra.endDate) }}</small>
            </dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>
