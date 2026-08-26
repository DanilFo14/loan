<script setup>
import { computed } from 'vue'
import Spoiler from './Spoiler.vue'
import { formatThousands, parseThousands, plural } from '../lib/format.js'

const props = defineProps({
  extras: { type: Array, required: true },
})

const emit = defineEmits(['add', 'remove', 'update'])

const extrasMeta = computed(() => {
  const n = props.extras.length
  if (!n) return ''
  return `${n} ${plural(n, 'платёж', 'платежа', 'платежей')}`
})

function onAmount(id, event) {
  emit('update', id, { amount: parseThousands(event.target.value) })
}
</script>

<template>
  <Spoiler eyebrow="Шаг 2" title="Досрочные погашения" :meta="extrasMeta">
    <p class="hint spoiler-lead">
      <strong>Срок</strong> — платёж тот же, кредит короче.
      <strong>Платёж</strong> — срок тот же, ежемесячный взнос меньше.
    </p>

    <div v-if="extras.length" class="extra-list">
      <article v-for="item in extras" :key="item.id" class="extra-row">
        <label class="field">
          <span>Дата</span>
          <div class="input-wrap">
            <input
              :value="item.date"
              type="date"
              @input="emit('update', item.id, { date: $event.target.value })"
            />
          </div>
        </label>

        <label class="field">
          <span>Сумма</span>
          <div class="input-wrap">
            <input
              :value="formatThousands(item.amount || '')"
              inputmode="numeric"
              autocomplete="off"
              placeholder="100 000"
              @input="onAmount(item.id, $event)"
            />
            <em>₽</em>
          </div>
        </label>

        <label class="field">
          <span>Тип</span>
          <div class="input-wrap">
            <select
              :value="item.type"
              @change="emit('update', item.id, { type: $event.target.value })"
            >
              <option value="term">Уменьшение срока</option>
              <option value="payment">Уменьшение платежа</option>
            </select>
          </div>
        </label>

        <button
          class="icon-btn"
          type="button"
          title="Удалить платёж"
          aria-label="Удалить платёж"
          @click="emit('remove', item.id)"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </article>
    </div>

    <p v-else class="empty">Пока нет досрочных платежей — график строится как обычный аннуитет.</p>

    <button class="btn-secondary mt-4 w-full" type="button" @click="emit('add')">
      + Добавить платёж
    </button>
  </Spoiler>
</template>
