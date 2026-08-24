<script setup lang="ts">
import { computed } from 'vue'

import { segmentClauseRefs } from '../../domain/clauseLink'

const props = defineProps<{
  text: string
  /** 全书条文顺序（clauseOrder），用于条文号 → clauseId 映射 */
  clauseOrder: string[]
}>()

const segments = computed(() => segmentClauseRefs(props.text, props.clauseOrder.length))

function hrefOf(no: number | undefined): string {
  if (no == null) return ''
  return `/clauses/${props.clauseOrder[no - 1] ?? ''}`
}
</script>

<template>
  <template
    v-for="(segment, index) in segments"
    :key="index"
  >
    <RouterLink
      v-if="segment.type === 'clause'"
      :to="hrefOf(segment.no)"
      class="text-indigo underline decoration-indigo/30 underline-offset-2"
    >
      {{ segment.text }}
    </RouterLink>
    <span v-else>{{ segment.text }}</span>
  </template>
</template>
