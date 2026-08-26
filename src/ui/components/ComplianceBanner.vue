<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    text?: string
    tone?: 'cinnabar' | 'muted'
    showFeedback?: boolean
  }>(),
  {
    text: '仅供学习研究，不构成医疗建议，请勿自行用药',
    tone: 'cinnabar',
    showFeedback: false,
  }
)
</script>

<template>
  <div
    class="fixed inset-x-0 bottom-0 z-30 px-4 pb-[env(safe-area-inset-bottom)] lg:pl-56"
    role="note"
    aria-live="polite"
  >
    <div
      class="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-t-lg px-4 py-2.5 text-center text-xs font-semibold"
      :class="
        tone === 'cinnabar'
          ? 'bg-cinnabar text-white'
          : 'bg-paper-card text-ink-muted shadow-[0_-2px_8px_rgba(34,26,16,.06)]'
      "
    >
      <TriangleAlert
        class="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span>{{ text }}</span>
      <RouterLink
        v-if="showFeedback"
        to="/feedback"
        class="shrink-0 font-semibold underline underline-offset-2"
        :class="tone === 'cinnabar' ? 'text-white' : 'text-indigo'"
      >
        内容纠错
      </RouterLink>
    </div>
  </div>
</template>
