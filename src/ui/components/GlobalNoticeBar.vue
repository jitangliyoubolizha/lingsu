<script setup lang="ts">
import { TriangleAlert, X } from 'lucide-vue-next'

import { useNoticeBar } from '../composables/useNoticeBar'

withDefaults(
  defineProps<{
    lifted?: boolean
  }>(),
  {
    lifted: false,
  }
)

const { visible, dismiss } = useNoticeBar()
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-x-0 z-30 px-3 lg:pl-56 lg:pr-4"
    :class="
      lifted
        ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[env(safe-area-inset-bottom)]'
        : 'bottom-0 pb-[env(safe-area-inset-bottom)]'
    "
    role="note"
  >
    <div
      class="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-t-lg border border-b-0 border-border-paper bg-paper-card px-4 py-2 text-xs text-ink-muted shadow-[0_-2px_8px_rgba(34,26,16,.06)]"
    >
      <TriangleAlert
        class="h-4 w-4 shrink-0"
        aria-hidden="true"
      />
      <span class="truncate">仅供学习研究，不构成医疗建议，请勿自行用药</span>
      <RouterLink
        to="/feedback"
        class="shrink-0 text-xs font-semibold text-indigo hover:underline"
      >
        内容纠错
      </RouterLink>
      <button
        type="button"
        class="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
        aria-label="收起提示（7 天内不再显示）"
        @click="dismiss"
      >
        <X
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
      </button>
    </div>
  </div>
</template>
