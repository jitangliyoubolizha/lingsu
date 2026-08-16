<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    active?: boolean
    tone?: 'default' | 'cinnabar' | 'green' | 'gold' | 'muted'
    clickable?: boolean
  }>(),
  {
    active: false,
    tone: 'default',
    clickable: false,
  }
)

const classes = computed(() => {
  if (props.active) {
    return 'bg-cinnabar text-white border-transparent'
  }
  const tones: Record<string, string> = {
    default: 'bg-paper-deep text-ink-secondary border-transparent',
    cinnabar: 'bg-cinnabar-soft text-cinnabar border-transparent',
    green: 'bg-green-soft text-green border-transparent',
    gold: 'bg-paper-deep text-gold border-transparent',
    muted: 'bg-paper-deep text-ink-muted border-transparent',
  }
  return `${tones[props.tone]} border-transparent`
})
</script>

<template>
  <component
    :is="clickable ? 'button' : 'span'"
    :type="clickable ? 'button' : undefined"
    class="inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
    :class="[classes, clickable ? 'cursor-pointer active:scale-95' : '']"
  >
    <slot />
  </component>
</template>
