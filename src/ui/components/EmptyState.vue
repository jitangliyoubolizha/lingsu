<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  {
    description: '',
  }
)
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <div
      class="flex h-14 w-14 items-center justify-center rounded-full bg-paper-deep text-ink-muted"
    >
      <slot name="icon">
        <span
          class="font-serif text-2xl"
          aria-hidden="true"
        >空</span>
      </slot>
    </div>
    <p class="font-serif text-base font-semibold text-ink">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="max-w-xs text-sm text-ink-muted"
    >
      {{ description }}
    </p>
    <div
      v-if="$slots.action"
      class="mt-1"
    >
      <slot name="action" />
    </div>
  </div>
</template>
