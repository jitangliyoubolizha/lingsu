<script setup lang="ts">
import { Check, Star } from 'lucide-vue-next'
import { computed } from 'vue'

import type { Clause } from '../../data/types'

const props = defineProps<{
  clause: Clause
  status: 'unlearned' | 'learning' | 'mastered'
  favorite: boolean
}>()

const title = computed(() => `太阳·第 ${props.clause.no} 条`)

const statusText = computed(() => {
  const map = {
    unlearned: '未学',
    learning: '学习中',
    mastered: '已掌握',
  } as const
  return map[props.status]
})

const statusClass = computed(() => {
  const map = {
    unlearned: 'bg-paper-deep text-ink-muted',
    learning: 'bg-paper-deep text-gold',
    mastered: 'bg-green-soft text-green',
  } as const
  return map[props.status]
})
</script>

<template>
  <RouterLink
    :to="`/clauses/${clause.id}`"
    class="flex min-h-[52px] items-start gap-3 rounded-2xl border border-border-paper bg-paper-card px-4 py-3 shadow-[0_4px_12px_rgba(34,26,16,.05)] transition-shadow active:scale-[0.99] active:shadow-md"
  >
    <div class="min-w-0 flex-1">
      <p class="text-xs text-ink-muted">
        {{ title }}
      </p>
      <p class="mt-1 line-clamp-2 font-serif text-[15px] leading-relaxed text-ink">
        {{ clause.text }}
      </p>
    </div>
    <div class="flex shrink-0 flex-col items-end gap-1.5">
      <Star
        class="h-4 w-4"
        :class="favorite ? 'fill-gold text-gold' : 'text-ink-muted'"
        :aria-label="favorite ? '已收藏' : '未收藏'"
      />
      <span
        class="inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-medium"
        :class="statusClass"
      >
        <Check
          v-if="status === 'mastered'"
          class="mr-0.5 h-3 w-3"
          aria-hidden="true"
        />
        {{ statusText }}
      </span>
    </div>
  </RouterLink>
</template>
