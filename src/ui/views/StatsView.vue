<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { loadContent } from '../../data'
import { computeChapterProgress, computeLearningStats, computeStreakDays } from '../../domain'
import type { ReviewLog } from '../../domain/memory'
import {
  getAllCards,
  getAllDailyLogs,
  getClauseStates,
  getFavorites,
  getQuizLogs,
  getReviewLogs,
} from '../../store'
import AppHeader from '../components/AppHeader.vue'
import LoadingState from '../components/LoadingState.vue'
import ProgressBar from '../components/ProgressBar.vue'
import StatCard from '../components/StatCard.vue'

const loading = ref(true)
const streakDays = ref(0)
const totalLearned = ref(0)
const mastered = ref(0)
const learning = ref(0)
const dueReviews = ref(0)
const favoritesCount = ref(0)
const accuracy = ref(0)
const retention = ref(0)
const chapterProgress = ref<Array<{ code: string; name: string; done: number; total: number }>>([])
const heatDays = ref<Array<{ label: string; value: number }>>([])
const trend = ref<number[]>([])
const weekLabels = ref(['', ''])

function formatDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function computeHeatDays(
  dailyLogs: Array<{ date: string; requiredCount: number; completedCount: number }>
) {
  const completed = new Set(
    dailyLogs.filter((log) => log.completedCount >= log.requiredCount).map((log) => log.date)
  )
  const now = new Date()
  // 本周周一（getDay() 周日=0、周一=1 … 周六=6；周一偏移 1 - getDay()，周日为 -6）
  const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const labels = ['一', '二', '三', '四', '五', '六', '日']
  return labels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      label,
      value: completed.has(formatDay(date)) ? 1 : 0,
    }
  })
}

function computeTrend(reviewLogs: ReviewLog[]): { values: number[]; labels: string[] } {
  const values: number[] = []
  const labels: string[] = []
  const now = new Date()
  for (let week = 6; week >= 0; week -= 1) {
    const start = new Date(now)
    start.setDate(now.getDate() - week * 7 - 6)
    const end = new Date(now)
    end.setDate(now.getDate() - week * 7)
    const logs = reviewLogs.filter((log) => {
      const t = log.reviewedAt.getTime()
      return t >= start.getTime() && t <= end.getTime()
    })
    const remembered = logs.filter((log) => log.rating >= 2).length
    values.push(logs.length === 0 ? 0 : Math.round((remembered / logs.length) * 100))
    labels.push(`周${week + 1}`)
  }
  return { values, labels }
}

async function load() {
  const data = await loadContent()
  const [cards, states, dailyLogs, quizLogs, reviewLogs, favorites] = await Promise.all([
    getAllCards(),
    getClauseStates(),
    getAllDailyLogs(),
    getQuizLogs(),
    getReviewLogs(),
    getFavorites(),
  ])

  const learnedIds = new Set(
    states.filter((state) => state.firstLearnedAt).map((state) => state.clauseId)
  )
  const stats = computeLearningStats(cards)

  streakDays.value = computeStreakDays(dailyLogs)
  totalLearned.value = learnedIds.size
  mastered.value = stats.mastered
  learning.value = stats.learning
  dueReviews.value = stats.dueReviews
  favoritesCount.value = favorites.length
  accuracy.value =
    quizLogs.length === 0
      ? 0
      : Math.round((quizLogs.filter((log) => log.correct).length / quizLogs.length) * 100)
  retention.value =
    reviewLogs.length === 0
      ? 0
      : Math.round((reviewLogs.filter((log) => log.rating >= 2).length / reviewLogs.length) * 100)
  chapterProgress.value = computeChapterProgress(data, learnedIds)
  heatDays.value = computeHeatDays(dailyLogs)
  const trendData = computeTrend(reviewLogs)
  trend.value = trendData.values
  weekLabels.value = [
    trendData.labels[0] ?? '',
    trendData.labels[trendData.labels.length - 1] ?? '',
  ]

  loading.value = false
}

function heatClass(value: number) {
  return value === 1 ? 'bg-cinnabar' : 'bg-[#F1EAD9]'
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <AppHeader
      title="统计"
      show-back
      back-to="/"
    />

    <LoadingState v-if="loading" />

    <template v-else>
      <section class="grid grid-cols-2 gap-3">
        <StatCard
          label="连续打卡"
          :value="streakDays"
          unit="天"
          tone="cinnabar"
        />
        <StatCard
          label="累计学习"
          :value="totalLearned"
          unit="条"
          tone="cinnabar"
        />
      </section>

      <section
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-4 font-serif text-base font-bold">
          学习日历
        </h2>
        <div
          class="grid grid-cols-7 gap-2"
          aria-label="最近一周打卡热力图"
        >
          <div
            v-for="day in heatDays"
            :key="day.label"
            class="flex flex-col items-center gap-1"
          >
            <div
              class="h-9 w-full rounded-md"
              :class="heatClass(day.value)"
              :aria-label="`周${day.label}${day.value === 1 ? '已打卡' : '未打卡'}`"
            />
            <span class="text-[10px] text-ink-muted">{{ day.label }}</span>
          </div>
        </div>
      </section>

      <section class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard
          label="已掌握"
          :value="mastered"
          unit="条"
        />
        <StatCard
          label="学习中"
          :value="learning"
          unit="条"
        />
        <StatCard
          label="待复习"
          :value="dueReviews"
          unit="条"
        />
        <StatCard
          label="已收藏"
          :value="favoritesCount"
          unit="条"
        />
        <StatCard
          label="正确率"
          :value="accuracy"
          unit="%"
        />
        <StatCard
          label="记忆保持率"
          :value="retention"
          unit="%"
        />
      </section>

      <section
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-4 font-serif text-base font-bold">
          篇章进度
        </h2>
        <div class="space-y-4">
          <div
            v-for="item in chapterProgress"
            :key="item.code"
          >
            <div class="mb-1 flex items-center justify-between text-sm">
              <span class="font-serif text-ink">{{ item.name }}</span>
              <span class="text-xs text-ink-muted">{{ item.done }}/{{ item.total }} ·
                {{ item.total === 0 ? 0 : Math.round((item.done / item.total) * 100) }}%</span>
            </div>
            <ProgressBar :value="item.total === 0 ? 0 : (item.done / item.total) * 100" />
          </div>
        </div>
      </section>

      <section
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-4 font-serif text-base font-bold">
          记忆保持率趋势
        </h2>
        <div
          class="flex h-32 items-end gap-2"
          aria-label="记忆保持率柱状图"
        >
          <div
            v-for="(value, index) in trend"
            :key="index"
            class="flex-1 rounded-t-md"
            :class="value > 0 ? 'bg-cinnabar/60' : 'bg-paper-deep'"
            :style="{ height: `${value}%` }"
            :aria-label="`第${index + 1}周 ${value}%`"
          />
        </div>
        <div class="mt-2 flex justify-between text-xs text-ink-muted">
          <span>{{ weekLabels[0] }}</span>
          <span>{{ weekLabels[1] }}</span>
        </div>
      </section>
    </template>
  </div>
</template>
