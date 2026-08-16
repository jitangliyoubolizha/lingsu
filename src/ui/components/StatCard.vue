<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    tone?: 'default' | 'cinnabar'
  }>(),
  {
    unit: '',
    tone: 'default',
  }
)
</script>

<template>
  <div
    class="rounded-2xl border border-border-paper bg-paper-card p-4 text-center shadow-[0_4px_12px_rgba(34,26,16,.05)]"
  >
    <p
      class="font-serif text-2xl font-bold leading-tight"
      :class="tone === 'cinnabar' ? 'text-cinnabar' : 'text-ink'"
    >
      {{ value
      }}<span
        v-if="unit"
        class="ml-0.5 text-sm font-medium text-ink-muted"
      >{{ unit }}</span>
    </p>
    <p class="mt-1 text-xs text-ink-muted">
      {{ label }}
    </p>
  </div>
</template>
