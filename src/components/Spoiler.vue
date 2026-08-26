<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  meta: { type: String, default: '' },
})

const root = ref(null)
let media

function syncOpen() {
  if (root.value && media?.matches) root.value.open = true
}

onMounted(() => {
  media = window.matchMedia('(min-width: 980px)')
  syncOpen()
  media.addEventListener('change', syncOpen)
})

onUnmounted(() => {
  media?.removeEventListener('change', syncOpen)
})
</script>

<template>
  <details ref="root" class="panel spoiler">
    <summary class="spoiler-summary">
      <div>
        <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
        <h2>{{ title }}</h2>
        <p v-if="meta" class="spoiler-meta">{{ meta }}</p>
      </div>
      <span class="chevron" aria-hidden="true"></span>
    </summary>
    <div class="spoiler-body">
      <slot />
    </div>
  </details>
</template>
