<script setup lang="ts">
import { Search, X } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    autofocus?: boolean
  }>(),
  {
    placeholder: '搜索条文、方剂、药物',
    autofocus: false,
  }
)

const emit = defineEmits<{
  submit: [value: string]
  clear: []
}>()

const model = defineModel<string>({ default: '' })
const inputRef = ref<{ focus: () => void } | null>(null)

onMounted(() => {
  if (props.autofocus) {
    inputRef.value?.focus()
  }
})

function handleSubmit() {
  emit('submit', model.value)
}

function clear() {
  model.value = ''
  emit('clear')
  inputRef.value?.focus()
}
</script>

<template>
  <form
    class="flex h-11 items-center gap-2 rounded-xl border border-border-paper bg-paper-card px-3 shadow-[0_2px_8px_rgba(34,26,16,.04)] focus-within:border-indigo focus-within:ring-2 focus-within:ring-indigo/20"
    role="search"
    @submit.prevent="handleSubmit"
  >
    <Search
      class="h-4 w-4 shrink-0 text-ink-muted"
      aria-hidden="true"
    />
    <input
      ref="inputRef"
      v-model="model"
      type="search"
      class="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
      :placeholder="props.placeholder"
      aria-label="搜索关键词"
    >
    <button
      v-if="model"
      type="button"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
      aria-label="清空搜索"
      @click="clear"
    >
      <X
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </form>
</template>
