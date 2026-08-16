<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    label?: string
  }>(),
  {
    rows: 3,
    label: '正在加载…',
  }
)
</script>

<template>
  <div
    class="space-y-3 py-6"
    role="status"
    aria-live="polite"
  >
    <div
      v-for="i in rows"
      :key="i"
      class="h-20 animate-pulse rounded-2xl border border-border-paper bg-paper-card"
    />
    <p class="pt-2 text-center text-sm text-ink-muted">
      {{ label }}
    </p>
  </div>
</template>
