<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

import { useRouterBack } from '../composables/useRouterBack'

const props = withDefaults(
  defineProps<{
    title?: string
    showBack?: boolean
    backTo?: string
    subtitle?: string
  }>(),
  {
    title: '',
    showBack: false,
    backTo: '/',
    subtitle: '',
  }
)

const { goBack } = useRouterBack(props.backTo)
</script>

<template>
  <header
    class="sticky top-0 z-30 -mx-5 mb-4 flex min-h-12 items-center gap-2 bg-paper/90 px-5 backdrop-blur"
  >
    <button
      v-if="showBack"
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full text-ink transition-transform active:scale-95"
      aria-label="返回"
      @click="goBack"
    >
      <ChevronLeft
        class="h-5 w-5"
        aria-hidden="true"
      />
    </button>
    <div class="min-w-0 flex-1">
      <h1
        v-if="title"
        class="truncate font-serif text-lg font-bold leading-tight"
      >
        {{ title }}
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
