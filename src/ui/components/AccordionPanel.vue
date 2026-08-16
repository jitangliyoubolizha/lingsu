<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    source?: string
    defaultOpen?: boolean
  }>(),
  {
    source: '',
    defaultOpen: false,
  }
)

const open = ref(props.defaultOpen)
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-border-paper bg-paper-card">
    <button
      type="button"
      class="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="flex-1 font-serif text-base font-semibold text-ink">{{ title }}</span>
      <span
        v-if="source"
        class="text-xs text-ink-muted"
      >{{ source }}</span>
      <ChevronDown
        class="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      />
    </button>
    <div
      v-show="open"
      class="border-t border-border-paper px-4 py-3"
    >
      <slot />
    </div>
  </section>
</template>
