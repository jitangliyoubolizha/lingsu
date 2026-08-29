<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import { useFontSize } from '../composables/useFontSize'
import { applyDailyNew, getSetting, setSetting } from '../../store'

const { changeFontSize: applyFontSize } = useFontSize()

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const dailyNew = ref(5)
const fontSize = ref<'小' | '中' | '大'>('中')
const voiceEnabled = ref(true)
const settingsCustomMode = ref(false)
const customDraft = ref(6)
const DAILY_NEW_PRESETS = [3, 5, 8, 10]
const selectValue = computed(() =>
  DAILY_NEW_PRESETS.includes(dailyNew.value) ? String(dailyNew.value) : 'custom'
)

function clampDailyNew(value: number): number {
  if (!Number.isFinite(value)) return 5
  return Math.min(20, Math.max(1, Math.round(value)))
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    settingsCustomMode.value = false
    dailyNew.value = await getSetting<number>('dailyNew', 5)
    fontSize.value = await getSetting<'小' | '中' | '大'>('fontSize', '中')
    voiceEnabled.value = await getSetting<boolean>('voiceEnabled', true)
  }
)

async function changeDailyNew(value: number) {
  const clamped = clampDailyNew(value)
  dailyNew.value = clamped
  await applyDailyNew(clamped)
  emit('changed')
}

function onDailyNewSelectChange(event: Event) {
  const value = String((event.target as unknown as { value: string }).value)
  if (value === 'custom') {
    settingsCustomMode.value = true
    customDraft.value = dailyNew.value
    return
  }
  void changeDailyNew(Number(value))
}

async function changeFontSize(value: '小' | '中' | '大') {
  fontSize.value = value
  await applyFontSize(value)
}

async function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value
  await setSetting('voiceEnabled', voiceEnabled.value)
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
  >
    <div
      aria-label="设置遮罩"
      class="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      @click="emit('close')"
    />
    <div
      aria-label="设置弹层"
      role="dialog"
      aria-modal="true"
      class="relative w-full max-w-2xl rounded-t-2xl border border-border-paper bg-paper-card p-4 shadow-[0_-8px_24px_rgba(34,26,16,.18)] sm:max-w-md sm:rounded-2xl sm:shadow-[0_16px_48px_rgba(0,0,0,.35)]"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-serif text-base font-bold text-ink">
          设置
        </h2>
        <button
          type="button"
          aria-label="关闭设置"
          class="flex h-8 w-8 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          @click="emit('close')"
        >
          <X
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>

      <div class="divide-y divide-border-paper/60">
        <div class="flex items-center justify-between py-3">
          <span class="text-sm text-ink-secondary">每日新学数量</span>
          <select
            :value="selectValue"
            aria-label="每日新学数量"
            class="h-9 rounded-lg border border-border-paper bg-paper px-2 text-sm text-ink"
            @change="onDailyNewSelectChange"
          >
            <option
              v-for="n in DAILY_NEW_PRESETS"
              :key="n"
              :value="String(n)"
            >
              {{ n }} 条/日
            </option>
            <option value="custom">
              自定义…
            </option>
          </select>
        </div>
        <div
          v-if="settingsCustomMode"
          class="flex items-center justify-end gap-2 py-2"
        >
          <label class="text-xs text-ink-muted">自定义条数（1~20）</label>
          <input
            v-model.number="customDraft"
            type="number"
            min="1"
            max="20"
            aria-label="自定义条数"
            class="h-9 w-20 rounded-lg border border-border-paper bg-paper px-2 text-center text-sm text-ink focus:border-cinnabar/50 focus:outline-none"
          >
          <button
            type="button"
            class="h-9 rounded-lg bg-cinnabar px-3 text-xs font-semibold text-white hover:bg-cinnabar-deep"
            @click="changeDailyNew(clampDailyNew(customDraft))"
          >
            应用
          </button>
        </div>

        <div class="flex items-center justify-between py-3">
          <span class="text-sm text-ink-secondary">字号大小</span>
          <div class="flex gap-1">
            <button
              v-for="size in ['小', '中', '大'] as const"
              :key="size"
              type="button"
              class="h-9 w-12 rounded-lg text-sm"
              :class="fontSize === size ? 'bg-cinnabar text-white' : 'bg-paper-deep text-ink-secondary'"
              @click="changeFontSize(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between py-3">
          <span class="text-sm text-ink-secondary">朗读语音</span>
          <button
            type="button"
            role="switch"
            :aria-checked="voiceEnabled"
            class="relative h-6 w-11 rounded-full transition-colors"
            :class="voiceEnabled ? 'bg-green' : 'bg-paper-deep'"
            @click="toggleVoice"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
              :class="voiceEnabled ? 'left-[22px]' : 'left-0.5'"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
