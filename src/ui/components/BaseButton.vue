<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    block: false,
  }
)

const classes = computed(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-sans font-semibold transition-all duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'
  const sizes = {
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-[15px]',
  } as const
  const variants = {
    primary: 'bg-cinnabar text-white shadow-[0_4px_10px_rgba(110,0,0,.15)] hover:bg-cinnabar-deep',
    secondary:
      'border border-border-paper bg-paper-card text-ink shadow-[0_2px_8px_rgba(34,26,16,.04)] hover:bg-paper-deep',
    ghost: 'text-ink-secondary hover:bg-paper-deep hover:text-ink',
  } as const
  return [base, sizes[props.size], variants[props.variant], props.block ? 'w-full' : '']
})
</script>

<template>
  <button
    type="button"
    class=""
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
