<script setup lang="ts">
import { Bell, ChevronRight, Flame } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { ContentData } from '../../data/types'
import { loadContent } from '../../data'
import { computeChapterProgress, computeLearningStats, computeStreakDays } from '../../domain'
import type { DailyQueue } from '../../domain/memory'
import { getTodayQueue } from '../../domain/memory'
import {
  ensureDefaultStudyPlan,
  getActiveStudyPlans,
  getAllCards,
  getAllDailyLogs,
  getClauseStates,
  getDailyLog,
} from '../../store'
import ProgressBar from '../components/ProgressBar.vue'
import SearchBar from '../components/SearchBar.vue'

const keyword = ref('')
const content = ref<ContentData>()
const queue = ref<DailyQueue>({ dueCards: [], newClauses: [] })
const taskDone = ref(0)
const streakDays = ref(0)
const loading = ref(true)
const chapterProgress = ref<Array<{ code: string; name: string; done: number; total: number }>>([])
const learningStats = ref({ mastered: 0, learning: 0, dueReviews: 0 })

const taskTotal = computed(() => queue.value.dueCards.length + queue.value.newClauses.length)

const todayKey = new Date().toISOString().slice(0, 10)

async function loadHome() {
  try {
    const data = loadContent()
    content.value = data
    await ensureDefaultStudyPlan()

    const [plans, cards, states, dailyLogs, todayLog] = await Promise.all([
      getActiveStudyPlans(),
      getAllCards(),
      getClauseStates(),
      getAllDailyLogs(),
      getDailyLog(todayKey),
    ])

    const learnedIds = new Set(
      states.filter((state) => state.firstLearnedAt).map((state) => state.clauseId)
    )
    queue.value = getTodayQueue(cards, plans, data.clauses, learnedIds, 20, new Date())
    taskDone.value = todayLog?.completedCount ?? 0
    streakDays.value = computeStreakDays(dailyLogs)
    chapterProgress.value = computeChapterProgress(data, learnedIds)
    learningStats.value = computeLearningStats(cards)
  } finally {
    loading.value = false
  }
}

onMounted(loadHome)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <header class="flex min-h-12 items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-md bg-cinnabar font-serif text-lg font-bold text-white shadow-[0_4px_10px_rgba(110,0,0,.15)]"
          aria-label="灵素印章"
        >
          灵
        </span>
        <span class="font-serif text-lg font-bold">灵素</span>
      </div>
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-paper-deep"
        aria-label="通知"
      >
        <Bell
          class="h-5 w-5"
          aria-hidden="true"
        />
      </button>
    </header>

    <div class="mt-2">
      <RouterLink
        to="/search"
        aria-label="搜索"
      >
        <SearchBar
          v-model="keyword"
          placeholder="搜索条文、方剂、药物"
        />
      </RouterLink>
    </div>

    <section
      class="mt-5 rounded-2xl border border-border-paper bg-paper-card px-5 py-4 text-center shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <p class="font-serif text-base leading-relaxed text-ink-secondary">
        「太阳之为病，脉浮，头项强痛而恶寒。」
      </p>
      <p class="mt-1 text-xs text-ink-muted">
        ——《伤寒论》第 1 条
      </p>
    </section>

    <section
      class="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-cinnabar to-cinnabar-deep p-5 text-white shadow-[0_8px_24px_rgba(110,0,0,.18)]"
    >
      <div class="flex items-center justify-between">
        <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">今日任务</span>
        <span class="flex items-center gap-1 text-xs font-medium text-white/85">
          <Flame
            class="h-4 w-4"
            aria-hidden="true"
          />
          连续 {{ streakDays }} 天
        </span>
      </div>
      <h2 class="mt-4 font-serif text-2xl font-bold leading-snug">
        温故而知新<br>今日宜背诵
      </h2>
      <div
        v-if="!loading"
        class="mt-4 flex items-center justify-between text-xs text-white/80"
      >
        <span>已完成 {{ taskDone }} / {{ taskTotal }} 条</span>
        <span>{{ taskTotal === 0 ? 0 : Math.round((taskDone / taskTotal) * 100) }}%</span>
      </div>
      <ProgressBar
        class="mt-2"
        tone="cinnabar"
        :value="taskTotal === 0 ? 0 : (taskDone / taskTotal) * 100"
      />
      <RouterLink
        v-if="!loading"
        to="/study"
        class="mt-5 flex h-12 items-center justify-center gap-1 rounded-xl bg-white font-sans text-[15px] font-semibold text-cinnabar shadow-[0_4px_10px_rgba(0,0,0,.12)] transition-transform active:scale-[0.98]"
      >
        开始背诵 ({{ taskDone }}/{{ taskTotal }})
        <ChevronRight
          class="h-4 w-4"
          aria-hidden="true"
        />
      </RouterLink>
      <div
        v-else
        class="mt-5 h-12 animate-pulse rounded-xl bg-white/50"
      />
    </section>

    <section
      class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <div class="flex items-center justify-between">
        <h2 class="font-serif text-base font-bold">
          学习统计
        </h2>
        <RouterLink
          to="/stats"
          class="flex items-center gap-0.5 text-xs text-indigo"
        >
          查看全部 <ChevronRight
            class="h-3.5 w-3.5"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
      <div
        class="mt-4 flex justify-between gap-1.5"
        aria-label="本周打卡热力图"
      >
        <div
          v-for="(day, index) in ['一', '二', '三', '四', '五', '六', '日']"
          :key="day"
          class="flex flex-1 flex-col items-center gap-1"
        >
          <div
            class="h-8 w-full rounded-md"
            :class="index < 5 ? 'bg-cinnabar' : 'bg-paper-deep'"
            :aria-label="`周${day}${index < 5 ? '已打卡' : '未打卡'}`"
          />
          <span class="text-[10px] text-ink-muted">{{ day }}</span>
        </div>
      </div>
      <div class="mt-4 space-y-3">
        <div
          v-for="item in chapterProgress"
          :key="item.code"
        >
          <div class="mb-1 flex items-center justify-between text-xs">
            <span class="font-serif text-sm text-ink">{{ item.name }}</span>
            <span class="text-ink-muted">{{ item.done }}/{{ item.total }} ·
              {{ item.total === 0 ? 0 : Math.round((item.done / item.total) * 100) }}%</span>
          </div>
          <ProgressBar :value="item.total === 0 ? 0 : (item.done / item.total) * 100" />
        </div>
      </div>
    </section>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <RouterLink
        to="/clauses"
        class="flex min-h-20 flex-col justify-between rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)] transition-transform active:scale-[0.98]"
      >
        <span class="text-sm font-semibold text-ink">条文库</span>
        <span class="text-xs text-ink-muted">按篇浏览原文</span>
      </RouterLink>
      <RouterLink
        to="/formulas"
        class="flex min-h-20 flex-col justify-between rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)] transition-transform active:scale-[0.98]"
      >
        <span class="text-sm font-semibold text-ink">方剂</span>
        <span class="text-xs text-ink-muted">类方分组浏览</span>
      </RouterLink>
    </div>
  </div>
</template>
