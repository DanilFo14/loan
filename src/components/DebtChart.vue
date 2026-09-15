<script setup>
import { computed, ref } from 'vue'
import { formatMoney, formatThousands } from '../lib/format.js'

const props = defineProps({
  baseRows: { type: Array, default: () => [] },
  extraRows: { type: Array, default: () => [] },
  principal: { type: Number, default: 0 },
})

const hover = ref(null)
const svgRef = ref(null)

const W = 720
const H = 280
const P = { top: 20, right: 16, bottom: 40, left: 82 }

const series = computed(() => {
  const base = [{ month: 0, remaining: props.principal }, ...props.baseRows.map((row) => ({
    month: row.month,
    remaining: row.remaining,
  }))]
  const extra = [{ month: 0, remaining: props.principal }, ...props.extraRows.map((row) => ({
    month: row.month,
    remaining: row.remaining,
  }))]
  return { base, extra }
})

const maxMonth = computed(() =>
  Math.max(series.value.base.at(-1)?.month || 1, series.value.extra.at(-1)?.month || 1, 1),
)

const maxY = computed(() => Math.max(props.principal, 1))

function x(month) {
  const inner = W - P.left - P.right
  return P.left + (month / maxMonth.value) * inner
}

function y(value) {
  const inner = H - P.top - P.bottom
  return P.top + inner - (value / maxY.value) * inner
}

function toPoints(rows) {
  return rows.map((row) => `${x(row.month)},${y(row.remaining)}`).join(' ')
}

const yTicks = computed(() => {
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) => (maxY.value / steps) * i)
})

const xTicks = computed(() => {
  const max = maxMonth.value
  const years = Math.floor(max / 12)
  const step = years > 16 ? 4 : years > 8 ? 2 : 1
  const ticks = []
  for (let year = 0; year <= years; year += step) {
    ticks.push(year * 12)
  }
  return ticks
})

function onMove(event) {
  const svg = svgRef.value
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const svgX = ((event.clientX - rect.left) / rect.width) * W
  const inner = W - P.left - P.right
  const ratio = Math.min(1, Math.max(0, (svgX - P.left) / inner))
  const month = Math.round(ratio * maxMonth.value)
  const lastBase = series.value.base.at(-1)
  const lastExtra = series.value.extra.at(-1)
  const base =
    month > (lastBase?.month ?? 0)
      ? { remaining: 0 }
      : series.value.base.find((row) => row.month === month) || lastBase
  const extra =
    month > (lastExtra?.month ?? 0)
      ? { remaining: 0 }
      : series.value.extra.find((row) => row.month === month) || nearest(series.value.extra, month)
  hover.value = {
    month,
    x: x(month),
    base: base?.remaining ?? 0,
    extra: extra?.remaining ?? 0,
  }
}

function nearest(rows, month) {
  return rows.reduce((best, row) =>
    Math.abs(row.month - month) < Math.abs(best.month - month) ? row : best,
  )
}
</script>

<template>
  <section class="panel">
    <header class="panel-head row">
      <div>
        <p class="eyebrow">Динамика долга.</p>
        <h2>Как тает остаток</h2>
      </div>
      <ul class="legend">
        <li><i class="dot navy" />Без досрочек</li>
        <li><i class="dot moss" />С досрочками</li>
      </ul>
    </header>

    <div class="chart-wrap">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${W} ${H}`"
        role="img"
        aria-label="График остатка долга"
        @mousemove="onMove"
        @mouseleave="hover = null"
      >
        <line
          v-for="tick in yTicks"
          :key="'y' + tick"
          :x1="P.left"
          :x2="W - P.right"
          :y1="y(tick)"
          :y2="y(tick)"
          class="grid"
        />
        <text
          v-for="tick in yTicks"
          :key="'yl' + tick"
          :x="P.left - 10"
          :y="y(tick) + 5"
          class="axis"
          text-anchor="end"
        >
          {{ formatThousands(Math.round(tick)) }}
        </text>
        <text
          v-for="tick in xTicks"
          :key="'x' + tick"
          :x="x(tick)"
          :y="H - 16"
          class="axis"
          text-anchor="middle"
        >
          {{ tick === 0 ? 'старт' : `${tick / 12} г.` }}
        </text>

        <polyline class="line navy" fill="none" :points="toPoints(series.base)" />
        <polyline class="line moss" fill="none" :points="toPoints(series.extra)" />

        <g v-if="hover">
          <line :x1="hover.x" :x2="hover.x" :y1="P.top" :y2="H - P.bottom" class="hover-line" />
          <circle :cx="hover.x" :cy="y(hover.base)" r="4" class="navy-fill" />
          <circle :cx="hover.x" :cy="y(hover.extra)" r="4" class="moss-fill" />
        </g>
      </svg>

      <div v-if="hover" class="chart-tip">
        <p>Месяц {{ hover.month }}</p>
        <p>База: {{ formatMoney(hover.base, { integer: true }) }}</p>
        <p>С досрочками: {{ formatMoney(hover.extra, { integer: true }) }}</p>
      </div>
    </div>
  </section>
</template>
