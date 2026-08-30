<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

import { useRouterBack } from '../composables/useRouterBack'

const props = withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
    backTo?: string
    subtitle?: string
    /** 为 true 时点击返回只触发 back 事件，由父组件决定返回方式 */
    emitBack?: boolean
  }>(),
  {
    title: '',
    showBack: false,
    backTo: '/',
    subtitle: '',
    emitBack: false,
  }
)

const emit = defineEmits<{ back: [] }>()

const { goBack } = useRouterBack(props.backTo)

function onBackClick() {
  if (props.emitBack) {
    emit('back')
  } else {
    goBack()
  }
}
</script>

<template>
  <header
    class="sticky top-0 z-30 -mx-5 mb-4 flex min-h-12 items-center gap-2 border-b border-cinnabar/15 bg-paper/90 px-5 backdrop-blur"
  >
    <button
      v-if="showBack"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform active:scale-95"
      aria-label="返回"
      @click="onBackClick"
    >
      <ChevronLeft
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>
    <div class="min-w-0 flex-1">
      <h1
        v-if="title"
        class="flex min-w-0 items-center gap-2 font-serif text-lg font-bold leading-tight"
      >
        <span
          class="inline-flex h-5 w-5 shrink-0 rotate-6 items-center justify-center rounded-[4px] bg-cinnabar font-serif text-[11px] leading-none text-white"
          aria-hidden="true"
        >
          灵
        </span>
        <span class="truncate">{{ title }}</span>
      </h1>
      <p
        v-if="subtitle"
        class="truncate text-xs text-ink-muted"
      >
        {{ subtitle }}
      </p>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <slot name="actions" />
    </div>
  </header>
</template>
