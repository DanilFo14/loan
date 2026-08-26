<script setup>
import { formatDate, formatMoney, formatPercent, formatTerm } from '../lib/format.js'

defineProps({
  result: { type: Object, default: null },
})
</script>

<template>
  <section v-if="result" class="space-y-4">
    <div v-if="result.hasExtras && result.savings > 0" class="save-banner">
      <p class="eyebrow text-moss">Выгода досрочного погашения</p>
      <p class="save-value">Вы сэкономили {{ formatMoney(result.savings, { integer: true }) }}</p>
      <p class="hint">
        Переплата {{ formatMoney(result.base.totalInterest, { integer: true }) }}
        → {{ formatMoney(result.extra.totalInterest, { integer: true }) }}
      </p>
    </div>
    <div v-else-if="result.hasExtras && result.savings <= 0" class="save-banner muted">
      <p class="hint">Досрочные платежи не уменьшили переплату — проверьте даты и суммы.</p>
    </div>

    <div class="compare-grid" :class="{ single: !result.hasExtras }">
      <article class="panel result-card">
        <header class="panel-head">
          <p class="eyebrow">Без досрочек</p>
          <h2>Базовый сценарий</h2>
        </header>
        <dl class="stats">
          <div>
            <dt>Ежемесячный платёж</dt>
            <dd>{{ formatMoney(result.base.initialPayment) }}</dd>
          </div>
          <div>
            <dt>Переплата</dt>
            <dd>
              {{ formatMoney(result.base.totalInterest, { integer: true }) }}
              <small>{{ formatPercent(result.base.overpayPercent) }} от суммы кредита</small>
            </dd>
          </div>
          <div>
            <dt>Всего выплат</dt>
            <dd>{{ formatMoney(result.base.totalPaid, { integer: true }) }}</dd>
          </div>
          <div>
            <dt>Срок / погашение</dt>
            <dd>
              {{ formatTerm(result.base.months) }}
              <small>{{ formatDate(result.base.endDate) }}</small>
            </dd>
          </div>
        </dl>
      </article>

      <article v-if="result.hasExtras" class="panel result-card accent">
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
