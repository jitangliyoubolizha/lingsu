<script setup lang="ts">
import { ChevronRight, Download, FileX, Settings, Star, Upload, User } from 'lucide-vue-next'

import AppHeader from '../components/AppHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { dailyStats } from '../mockData'

const groups = [
  {
    title: '学习库',
    items: [
      { label: '我的收藏', icon: Star, to: '/clauses' },
      { label: '错题本', icon: FileX, to: '/quiz' },
    ],
  },
  {
    title: '数据管理',
    items: [
      { label: '导出备份', icon: Download, to: '/profile' },
      { label: '导入恢复', icon: Upload, to: '/profile' },
    ],
  },
  {
    title: '关于',
    items: [
      { label: '免责声明', icon: Settings, to: '/agreement' },
      { label: '内容来源', icon: Settings, to: '/profile' },
    ],
  },
]
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
          <span>{{ dailyStats.mastered }}%</span>
        </div>
        <ProgressBar :value="dailyStats.mastered" />
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
      <div class="flex items-center justify-between">
        <span class="text-sm text-ink-secondary">每日新学数量</span>
        <span class="text-sm text-ink">3 条/日</span>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-sm text-ink-secondary">字号大小</span>
        <span class="text-sm text-ink">中</span>
      </div>
      <div class="mt-3 flex items-center justify-between">
        <span class="text-sm text-ink-secondary">朗读语音</span>
        <span
          class="relative inline-flex h-6 w-11 items-center rounded-full bg-cinnabar"
          role="switch"
          aria-checked="true"
          aria-label="朗读语音开关"
        >
          <span class="ml-auto mr-0.5 h-5 w-5 rounded-full bg-white shadow" />
        </span>
      </div>
    </section>

    <p class="mt-6 text-center text-xs text-ink-muted">
      灵素 · 版本 v0.1.0
    </p>
  </div>
</template>
