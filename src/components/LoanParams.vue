<script setup>
import { ref, watch } from 'vue'
import Spoiler from './Spoiler.vue'
import { formatThousands, parseDecimal, parseThousands } from '../lib/format.js'

const props = defineProps({
  amount: { type: Number, required: true },
  rate: { type: Number, required: true },
  years: { type: Number, required: true },
  startDate: { type: String, required: true },
})

const emit = defineEmits(['update:amount', 'update:rate', 'update:years', 'update:startDate'])
const rateText = ref(String(props.rate).replace('.', ','))

watch(
  () => props.rate,
  (value) => {
    if (parseDecimal(rateText.value) !== value) {
      rateText.value = String(value).replace('.', ',')
    }
  },
)

function onAmount(event) {
  emit('update:amount', parseThousands(event.target.value))
}

function onRate(event) {
  rateText.value = event.target.value
  emit('update:rate', parseDecimal(event.target.value))
}

function onYears(event) {
  const value = Number(event.target.value)
  if (!Number.isFinite(value)) return
  emit('update:years', Math.min(30, Math.max(1, Math.round(value))))
}
</script>

<template>
  <Spoiler eyebrow="Шаг 1" title="Параметры кредита">
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="field sm:col-span-2">
        <span>Сумма кредита</span>
        <div class="input-wrap">
          <input
            :value="formatThousands(amount)"
            inputmode="numeric"
            autocomplete="off"
            placeholder="3 000 000"
            @input="onAmount"
          />
          <em>₽</em>
        </div>
      </label>

      <label class="field">
        <span>Ставка</span>
        <div class="input-wrap">
          <input
            :value="rateText"
            inputmode="decimal"
            autocomplete="off"
            placeholder="7,5"
            @input="onRate"
          />
          <em>% год.</em>
        </div>
      </label>

      <label class="field">
        <span>Срок</span>
        <div class="input-wrap">
          <input
            :value="years"
            type="number"
            min="1"
            max="30"
            step="1"
            @input="onYears"
          />
          <em>лет</em>
        </div>
      </label>

      <label class="field sm:col-span-2">
        <span>Дата начала выплат</span>
        <div class="input-wrap">
          <input
            :value="startDate"
            type="date"
            @input="emit('update:startDate', $event.target.value)"
          />
        </div>
      </label>
    </div>
  </Spoiler>
</template>
