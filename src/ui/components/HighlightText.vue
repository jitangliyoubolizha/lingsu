<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  text: string
  keyword: string
}>()

const segments = computed(() => {
  const keyword = props.keyword.trim()
  if (!keyword) return [{ text: props.text, highlight: false }]

  const lowerText = props.text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const result: Array<{ text: string; highlight: boolean }> = []
  let index = 0

  while (index < props.text.length) {
    const found = lowerText.indexOf(lowerKeyword, index)
    if (found === -1) {
      result.push({ text: props.text.slice(index), highlight: false })
      break
    }
    if (found > index) {
      result.push({ text: props.text.slice(index, found), highlight: false })
    }
    result.push({ text: props.text.slice(found, found + keyword.length), highlight: true })
    index = found + keyword.length
  }

  return result
})
</script>

<template>
  <span>
    <mark
      v-for="(segment, index) in segments"
      :key="index"
      :class="segment.highlight ? 'bg-transparent font-semibold text-cinnabar' : 'bg-transparent'"
    >
      {{ segment.text }}
    </mark>
  </span>
</template>
