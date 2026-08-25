<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

import type { FormulaSummary } from '../../data/types'

defineProps<{
  formula: FormulaSummary
}>()
</script>

<template>
  <RouterLink
    :to="`/formulas/${formula.id}`"
    class="flex min-h-12 items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-paper-deep active:scale-[0.99]"
  >
    <span class="font-serif text-[17px] text-ink">{{ formula.name }}</span>
    <ChevronRight
      class="h-4 w-4 shrink-0 text-ink-muted"
      aria-hidden="true"
    />
  </RouterLink>
</template>
