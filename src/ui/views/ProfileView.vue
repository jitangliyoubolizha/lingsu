<script setup lang="ts">
import { ChevronRight, Download, FileX, MessageCircle, Settings, Star, Upload, User } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import { loadMeta } from '../../data'
import {
  exportData,
  getClauseStates,
  getSetting,
  importData,
  serializeBackup,
  setSetting,
} from '../../store'
import AppHeader from '../components/AppHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'

const progress = ref(0)
const dailyNew = ref(3)
const fontSize = ref<'小' | '中' | '大'>('中')
const voiceEnabled = ref(true)
const fileInput = ref<{ click: () => void } | null>(null)

const groups = [
  {
    title: '学习库',
    items: [
      { label: '我的收藏', icon: Star, to: '/clauses' },
      { label: '待巩固', icon: FileX, to: '/wrong-book' },
    ],
  },
  {
    title: '关于',
    items: [
      { label: '免责声明', icon: Settings, to: '/agreement' },
      { label: '意见反馈', icon: MessageCircle, to: '/feedback' },
      { label: '内容来源', icon: Settings, to: '/profile' },
    ],
  },
]

async function load() {
  // 进度百分比只需要条文总数，取元数据的篇章统计，不加载条文正文
  const totalClauses = loadMeta().chapters.reduce((sum, chapter) => sum + chapter.clauseCount, 0)
  const states = await getClauseStates()
  const learned = states.filter((state) => state.firstLearnedAt).length
  progress.value = totalClauses === 0 ? 0 : Math.round((learned / totalClauses) * 100)
  dailyNew.value = await getSetting<number>('dailyNew', 3)
  fontSize.value = await getSetting<'小' | '中' | '大'>('fontSize', '中')
  voiceEnabled.value = await getSetting<boolean>('voiceEnabled', true)
}

async function changeDailyNew(value: number) {
  dailyNew.value = value
  await setSetting('dailyNew', value)
}

async function changeFontSize(value: '小' | '中' | '大') {
  fontSize.value = value
  await setSetting('fontSize', value)
}

async function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value
  await setSetting('voiceEnabled', voiceEnabled.value)
}

async function downloadBackup() {
  const backup = await exportData()
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `lingsu-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function onImportFile(event: Event) {
  const input = event.target as unknown as { files?: Array<{ text: () => Promise<string> }> | null }
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  await importData(text)
  await load()
  const element = event.target as unknown as { value?: string }
  element.value = ''
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader title="我的">
      <template #actions>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          aria-label="设置"
        >
          <Settings
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </template>
    </AppHeader>

    <section
      class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full bg-paper-deep text-ink-muted"
        >
          <User
            class="h-7 w-7"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-serif text-lg font-bold text-ink">
            本地学习者
          </p>
          <p class="text-xs text-ink-muted">
            未登录 · 数据仅保存在本机
          </p>
        </div>
      </div>
      <div class="mt-4">
        <div class="mb-1 flex justify-between text-xs text-ink-muted">
          <span>总体进度</span>
          <span>{{ progress }}%</span>
        </div>
        <ProgressBar :value="progress" />
      </div>
    </section>

    <section
      v-for="group in groups"
      :key="group.title"
      class="mt-4"
    >
      <h2 class="px-2 pb-2 text-xs font-semibold text-ink-muted">
        {{ group.title }}
      </h2>
      <div
        class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <RouterLink
          v-for="item in group.items"
          :key="item.label"
          :to="item.to"
          class="flex min-h-12 items-center gap-3 px-2"
        >
          <component
            :is="item.icon"
            class="h-5 w-5 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
          <span class="flex-1 text-[15px] text-ink">{{ item.label }}</span>
          <ChevronRight
            class="h-4 w-4 text-ink-muted"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
      <h2 class="mb-3 text-sm font-semibold text-ink-secondary">
        学习设置
      </h2>
      <div class="flex items-center justify-between">
        <span class="text-sm text-ink-secondary">每日新学数量</span>
        <select
          :value="dailyNew"
          class="h-9 rounded-lg border border-border-paper bg-paper-card px-2 text-sm text-ink"
          @change="changeDailyNew(Number(($event.target as unknown as { value: string }).value))"
        >
          <option :value="3">
            3 条/日
          </option>
          <option :value="5">
            5 条/日
          </option>
          <option :value="10">
            10 条/日
          </option>
        </select>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-sm text-ink-secondary">字号大小</span>
        <div class="flex gap-1">
          <button
            v-for="size in ['小', '中', '大'] as const"
            :key="size"
            type="button"
            class="h-9 rounded-lg px-3 text-sm"
            :class="
              fontSize === size ? 'bg-cinnabar text-white' : 'bg-paper-deep text-ink-secondary'
            "
            @click="changeFontSize(size)"
          >
            {{ size }}
          </button>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-sm text-ink-secondary">朗读语音</span>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="voiceEnabled ? 'bg-cinnabar' : 'bg-paper-deep'"
          role="switch"
          :aria-checked="voiceEnabled"
          aria-label="朗读语音开关"
          @click="toggleVoice"
        >
          <span
            class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
            :class="voiceEnabled ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
      <h2 class="mb-3 text-sm font-semibold text-ink-secondary">
        数据管理
      </h2>
      <div class="space-y-2">
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          @click="downloadBackup"
        >
          <Download
            class="h-5 w-5 text-ink-muted"
            aria-hidden="true"
          />
          导出备份
        </button>
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          @click="fileInput?.click()"
        >
          <Upload
            class="h-5 w-5 text-ink-muted"
            aria-hidden="true"
          />
          导入恢复
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onImportFile"
        >
      </div>
    </section>

    <p class="mt-6 text-center text-xs text-ink-muted">
      灵素 · 版本 v0.1.0
    </p>
  </div>
</template>
