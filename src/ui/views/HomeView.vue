<script setup lang="ts">
import { ChevronRight, Flame, Moon, Network, Sun } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { ContentData } from '../../data/types'
import { loadContent } from '../../data'
import { computeStreakDays, pickDailyItems } from '../../domain'
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
import { currentEffectiveTheme, useTheme } from '../composables/useTheme'
import CardStack from '../components/CardStack.vue'
import ProgressBar from '../components/ProgressBar.vue'
import SearchBar from '../components/SearchBar.vue'

/**
 * 首页卡片堆候选池：六经提纲（1/180/263/273/281/326）+ 经典主证与治则条。
 * 每日从中确定性抽取 5 条展示（pickDailyItems），同一天全站一致，跨天自动轮换。
 */
const FEATURED_CLAUSE_POOL = [1, 12, 16, 35, 71, 96, 154, 177, 180, 263, 273, 281, 316, 326, 337]

const { setMode } = useTheme()
// currentEffectiveTheme 内部读取共享的 mode 状态，computed 可随模式切换联动
const isDark = computed(() => currentEffectiveTheme() === 'dark')

function toggleTheme() {
  setMode(isDark.value ? 'light' : 'dark')
}

const keyword = ref('')
const content = ref<ContentData>()
const queue = ref<DailyQueue>({ dueCards: [], newClauses: [] })
const taskDone = ref(0)
const streakDays = ref(0)
const loading = ref(true)
/** 卡片堆数据；内容加载失败时回退为静态每日一句 */
const featuredClauses = ref<Array<{ no: number; text: string }>>([])
const contentFailed = ref(false)

const taskTotal = computed(() => queue.value.dueCards.length + queue.value.newClauses.length)

const todayKey = new Date().toISOString().slice(0, 10)

async function loadHome() {
  try {
    const data = await loadContent()
    content.value = data
    const clauseByNo = new Map(data.clauses.map((clause) => [clause.no, clause]))
    const candidates = FEATURED_CLAUSE_POOL.flatMap((no) => {
      const clause = clauseByNo.get(no)
      return clause ? [{ no, text: clause.text }] : []
    })
    // 与今日任务共用同一天口径（todayKey），当日固定同一批条文
    featuredClauses.value = pickDailyItems(candidates, 5, todayKey)
    await ensureDefaultStudyPlan()

    const [plans, cards, states, dailyLogRecords, todayLog] = await Promise.all([
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
    streakDays.value = computeStreakDays(dailyLogRecords)
  } catch {
    // 首页不因内容/存储异常阻塞，卡片堆回退为静态引文
    contentFailed.value = true
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
        :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
        @click="toggleTheme"
      >
        <Transition
          name="theme-icon"
          mode="out-in"
        >
          <Moon
            v-if="isDark"
            key="moon"
            class="h-5 w-5"
            aria-hidden="true"
          />
          <Sun
            v-else
            key="sun"
            class="h-5 w-5"
            aria-hidden="true"
          />
        </Transition>
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

    <div
      v-if="loading"
      class="mb-12 mt-6 h-64 animate-pulse rounded-2xl border border-border-paper bg-paper-card"
      aria-hidden="true"
    />
    <CardStack
      v-else-if="featuredClauses.length > 1"
      class="mb-12 mt-6 h-64"
      :items="featuredClauses"
      random-rotation
      :random-amplitude="4"
      :sensitivity="290"
      send-to-back-on-click
      autoplay
      :autoplay-delay="5000"
      pause-on-hover
      :rotation-step="1.5"
      :scale-step="0.05"
      transform-origin="50% 92%"
      aria-label="经典条文轮播"
    >
      <template #card="{ item }">
        <figure
          class="zhusi-rule relative flex h-full flex-col items-center justify-center rounded-2xl border border-border-paper bg-paper-card px-6 py-5 text-center shadow-[0_4px_12px_rgba(34,26,16,.05)]"
        >
          <span
            class="absolute left-3 top-2 h-3 w-3 rounded-tl-sm border-l-2 border-t-2 border-cinnabar/40"
            aria-hidden="true"
          />
          <span
            class="absolute bottom-2 right-3 h-3 w-3 rounded-br-sm border-b-2 border-r-2 border-cinnabar/40"
            aria-hidden="true"
          />
          <blockquote class="font-serif text-sm leading-relaxed text-ink-secondary sm:text-base">
            「{{ item.text }}」
          </blockquote>
          <figcaption class="mt-2 shrink-0 text-xs text-ink-muted">
            ——《伤寒论》第 {{ item.no }} 条
          </figcaption>
        </figure>
      </template>
    </CardStack>
    <section
      v-else
      class="zhusi-rule relative mt-5 rounded-2xl border border-border-paper bg-paper-card px-5 py-4 text-center shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <span
        class="absolute left-3 top-2 h-3 w-3 rounded-tl-sm border-l-2 border-t-2 border-cinnabar/40"
        aria-hidden="true"
      />
      <span
        class="absolute bottom-2 right-3 h-3 w-3 rounded-br-sm border-b-2 border-r-2 border-cinnabar/40"
        aria-hidden="true"
      />
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
        class="mt-5 flex h-12 items-center justify-center gap-1 rounded-xl bg-white font-sans text-[15px] font-semibold text-cinnabar shadow-[0_4px_10px_rgba(0,0,0,.12)] pressable"
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

    <div class="mt-4 grid grid-cols-2 gap-3">
      <RouterLink
        to="/clauses"
        class="flex min-h-20 flex-col justify-between rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)] pressable"
      >
        <span class="text-sm font-semibold text-ink">条文库</span>
        <span class="text-xs text-ink-muted">按篇浏览原文</span>
      </RouterLink>
      <RouterLink
        to="/formulas"
        class="flex min-h-20 flex-col justify-between rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)] pressable"
      >
        <span class="text-sm font-semibold text-ink">方剂</span>
        <span class="text-xs text-ink-muted">类方分组浏览</span>
      </RouterLink>
      <RouterLink
        to="/graph"
        class="col-span-2 flex min-h-20 items-center justify-between rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)] pressable"
      >
        <div>
          <p class="text-sm font-semibold text-ink">
            知识图谱
          </p>
          <p class="mt-1 text-xs text-ink-muted">
            方剂 · 中药 · 条文关系网络，药对一览
          </p>
        </div>
        <Network
          class="h-8 w-8 shrink-0 text-cinnabar/60"
          aria-hidden="true"
        />
      </RouterLink>
    </div>
  </div>
</template>
