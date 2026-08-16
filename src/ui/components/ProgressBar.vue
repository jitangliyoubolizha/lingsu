<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    tone?: 'cinnabar' | 'green'
    className?: string
  }>(),
  {
    tone: 'cinnabar',
    className: '',
  }
)

const percent = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div
    class="h-1.5 w-full overflow-hidden rounded-full bg-paper-deep"
    :class="className"
    role="progressbar"
    :aria-valuenow="percent"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div
      class="h-full rounded-full transition-[width] duration-300 ease-out"
      :class="tone === 'cinnabar' ? 'bg-cinnabar' : 'bg-green'"
      :style="{ width: `${percent}%` }"
    />
  </div>
</template>
