<script setup lang="ts">
import { Check, PenLine, RotateCcw, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { Clause, Question } from '../../data/types'
import { loadContent } from '../../data'
import { buildQuizDeck, createCard, getTodayQueue, reviewCard } from '../../domain'
import type { MemoryCard } from '../../domain/memory'
import {
  addQuizLog,
  addWrongQuestion,
  ensureDefaultStudyPlan,
  getActiveStudyPlans,
  getAllCards,
  getClauseStates,
  getDailyLog,
  getDueWrongQuestions,
  getSetting,
  markClauseLearned,
  markWrongCorrect,
  saveCard,
  saveDailyLog,
  saveReviewLog,
  setSetting,
} from '../../store'
import BaseButton from '../components/BaseButton.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { formatClauseRef, formatQuizType } from '../formatters'

type TaskItem =
  | { kind: 'new'; clause: Clause }
  | { kind: 'review'; card: MemoryCard; clause: Clause | undefined }
  | { kind: 'wrong'; question: Question }

const router = useRouter()
const route = useRoute()

const items = ref<TaskItem[]>([])
const currentIndex = ref(0)
const completedCount = ref(0)
const finished = ref(false)
const loading = ref(true)
const flipped = ref(false)
const selfRating = ref<'forgot' | 'fuzzy' | 'remember' | null>(null)
const wrongSelected = ref<number | null>(null)
const wrongSubmitted = ref(false)
const wrongCorrect = ref(false)

/* —— 首次进入任务量提醒（可不再提示，记录于本地设置） —— */
const showDailyTip = ref(false)

onMounted(async () => {
  try {
    const dismissed = await getSetting<boolean>('dailyTipDismissed', false)
    if (!dismissed) showDailyTip.value = true
  } catch {
    // 读取失败按未提醒处理，保守展示
  }
})

async function dismissDailyTip() {
  showDailyTip.value = false
  await setSetting('dailyTipDismissed', true)
}

function goDailySettings() {
  void router.push('/profile')
}

const todayKey = new Date().toISOString().slice(0, 10)
const current = computed(() => items.value[currentIndex.value])

const feedbackTo = computed(() => {
  const item = current.value
  if (!item) return { path: '/feedback' }
  const clauseId =
    item.kind === 'new'
      ? item.clause.id
      : item.kind === 'review'
        ? item.card.clauseId
        : item.question.clause
  return {
    path: '/feedback',
    query: { type: 'clause', location: formatClauseRef(clauseId), from: route.fullPath },
  }
})

const total = computed(() => items.value.length)
const progress = computed(() =>
  total.value === 0 ? 0 : ((completedCount.value + (selfRating.value ? 0 : 0)) / total.value) * 100
)

async function loadQueue() {
  try {
    const data = await loadContent()
    await ensureDefaultStudyPlan()

    const [plans, cards, states, dueWrongs] = await Promise.all([
      getActiveStudyPlans(),
      getAllCards(),
      getClauseStates(),
      getDueWrongQuestions(),
    ])
    const learnedIds = new Set(
      states.filter((state) => state.firstLearnedAt).map((state) => state.clauseId)
    )
    const queue = getTodayQueue(cards, plans, data.clauses, learnedIds, 20, new Date())
    const clauseById = new Map(data.clauses.map((clause) => [clause.id, clause]))
    const deckById = new Map(buildQuizDeck(data).map((question) => [question.id, question]))
    const wrongItems: TaskItem[] = dueWrongs.flatMap((record) => {
      const question = deckById.get(record.questionId)
      return question ? [{ kind: 'wrong' as const, question }] : []
    })

    items.value = [
      ...queue.dueCards.map((card) => ({
        kind: 'review' as const,
        card,
        clause: clauseById.get(card.clauseId),
      })),
      ...wrongItems,
      ...queue.newClauses.map((clause) => ({ kind: 'new' as const, clause })),
    ].slice(0, 20)

    const todayLog = await getDailyLog(todayKey)
    if (todayLog && todayLog.completedCount >= todayLog.requiredCount) {
      finished.value = true
    }
  } finally {
    loading.value = false
  }
}

function ratingNumber(rating: 'forgot' | 'fuzzy' | 'remember'): 1 | 2 | 3 {
  if (rating === 'forgot') return 1
  if (rating === 'fuzzy') return 2
  return 3
}

async function submitWrongAnswer() {
  const item = current.value
  if (!item || item.kind !== 'wrong' || wrongSelected.value === null || wrongSubmitted.value) {
    return
  }
  wrongSubmitted.value = true
  wrongCorrect.value = wrongSelected.value === item.question.answerIndex
  const answeredAt = new Date()
  await addQuizLog({
    questionId: item.question.id,
    type: item.question.type,
    correct: wrongCorrect.value,
    answeredAt,
  })
  if (wrongCorrect.value) {
    await markWrongCorrect(item.question.id, answeredAt)
  } else {
    await addWrongQuestion(item.question.id, answeredAt)
  }
}

function wrongOptionClass(index: number) {
  const item = current.value
  if (!item || item.kind !== 'wrong') return 'border-border-paper bg-paper-card'
  if (!wrongSubmitted.value) {
    return wrongSelected.value === index
      ? 'border-cinnabar bg-cinnabar-soft'
      : 'border-border-paper bg-paper-card'
  }
  if (index === item.question.answerIndex) return 'border-green bg-green-soft'
  if (index === wrongSelected.value) return 'border-red bg-cinnabar-soft'
  return 'border-border-paper bg-paper-card opacity-60'
}

async function completeCurrent() {
  const item = current.value
  if (!item) return

  if (item.kind === 'new') {
    const card = createCard(item.clause.id)
    await saveCard(card)
    await markClauseLearned(item.clause.id)
  } else if (item.kind === 'review' && item.card && selfRating.value) {
    const result = reviewCard(item.card, ratingNumber(selfRating.value), new Date())
    await saveCard(result.card)
    await saveReviewLog(result.log)
  } else if (item.kind === 'wrong' && !wrongSubmitted.value) {
    return
  }

  completedCount.value += 1
  selfRating.value = null
  flipped.value = false
  wrongSelected.value = null
  wrongSubmitted.value = false
  wrongCorrect.value = false

  if (currentIndex.value < items.value.length - 1) {
    currentIndex.value += 1
  } else {
    finished.value = true
    await saveDailyLog(todayKey, items.value.length, completedCount.value)
  }
}

function exit() {
  void router.push('/')
}

onMounted(loadQueue)
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col">
    <header class="flex min-h-12 items-center justify-between gap-2">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
        aria-label="退出学习"
        @click="exit"
      >
        <X
          class="h-5 w-5"
          aria-hidden="true"
        />
      </button>
      <span class="text-sm text-ink-secondary">
        {{
          finished ? '已完成' : loading ? '加载中' : `第 ${currentIndex + 1} 项 / 共 ${total} 项`
        }}
      </span>
      <RouterLink
        v-if="current"
        :to="feedbackTo"
        class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep hover:text-ink"
        aria-label="纠错"
      >
        <PenLine
          class="h-4 w-4"
          aria-hidden="true"
        />
      </RouterLink>
      <span
        v-else
        class="w-9"
        aria-hidden="true"
      />
    </header>

    <div class="mt-1">
      <ProgressBar :value="progress" />
    </div>

    <!-- 首次进入任务量提醒 -->
    <div
      v-if="showDailyTip"
      class="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed text-ink"
    >
      <p class="font-semibold text-ink">
        背诵任务量可以自己调整
      </p>
      <p class="mt-1 text-ink-secondary">
        默认每日新学 5 条。轻松可设 3 条，标准 5~8 条，强化 10 条以上，支持 1~20 条自定义。
      </p>
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          class="rounded-full bg-cinnabar px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-cinnabar-deep"
          @click="goDailySettings"
        >
          去设置
        </button>
        <button
          type="button"
          class="rounded-full border border-border-paper bg-paper-card px-3 py-1 text-xs text-ink-secondary transition-colors hover:bg-paper-deep"
          @click="dismissDailyTip"
        >
          我知道了
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="mt-10 text-center text-sm text-ink-muted"
    >
      正在加载今日任务…
    </div>

    <div
      v-else-if="finished"
      class="mt-16 flex flex-col items-center text-center"
    >
      <div class="relative">
        <div
          class="seal-stamp flex h-20 w-20 items-center justify-center rounded-lg border-2 border-cinnabar bg-cinnabar-soft/70 font-serif text-2xl font-bold text-cinnabar"
        >
          学成
        </div>
        <Check
          class="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full bg-green p-1 text-white"
          aria-hidden="true"
        />
      </div>
      <h2 class="mt-5 font-serif text-2xl font-bold text-ink">
        今日任务已完成
      </h2>
      <p class="mt-2 text-sm text-ink-muted">
        已完成 {{ completedCount }} / {{ total }} 项
      </p>
      <BaseButton
        class="mt-6 w-full max-w-xs"
        size="lg"
        @click="exit"
      >
        返回首页
      </BaseButton>
    </div>

    <div
      v-else-if="current"
      class="mt-6 flex flex-1 flex-col"
    >
      <!-- 新学条文 -->
      <div
        v-if="current.kind === 'new'"
        class="flex min-h-[360px] flex-col rounded-2xl border border-border-paper bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)]"
      >
        <p class="text-xs text-ink-muted">
          新学 · {{ formatClauseRef(current.clause.id) }}
        </p>
        <div class="mt-6 flex flex-1 items-center justify-center">
          <p class="text-center font-serif text-[26px] leading-[1.8] text-ink">
            {{ current.clause.text }}
          </p>
        </div>
        <p class="mt-4 rounded-xl bg-paper-deep p-3 text-sm leading-relaxed text-ink-secondary">
          {{ current.clause.translation }}
        </p>
        <BaseButton
          class="mt-4 w-full"
          size="lg"
          @click="completeCurrent"
        >
          学会了，进入下一项
        </BaseButton>
      </div>

      <!-- 错题巩固 -->
      <div
        v-else-if="current.kind === 'wrong'"
        class="flex min-h-[360px] flex-col rounded-2xl border border-border-paper bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)]"
      >
        <p class="text-xs text-ink-muted">
          错题巩固 · {{ formatQuizType(current.question.type) }} ·
          {{ formatClauseRef(current.question.clause) }}
        </p>
        <p class="mt-6 font-serif text-[22px] leading-relaxed text-ink">
          {{ current.question.prompt }}
        </p>

        <div class="mt-5 space-y-3">
          <button
            v-for="(option, index) in current.question.options"
            :key="index"
            type="button"
            class="flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left text-[15px] transition-colors duration-200"
            :class="wrongOptionClass(index)"
            :disabled="wrongSubmitted"
            @click="wrongSelected = index"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-sm font-semibold text-ink-secondary"
              :class="
                wrongSubmitted && index === current.question.answerIndex
                  ? 'bg-green text-white'
                  : wrongSubmitted && index === wrongSelected
                    ? 'bg-red text-white'
                    : ''
              "
            >
              {{ String.fromCharCode(65 + index) }}
            </span>
            <span class="flex-1">{{ option }}</span>
            <Check
              v-if="wrongSubmitted && index === current.question.answerIndex"
              class="h-5 w-5 text-green"
              aria-hidden="true"
            />
            <X
              v-else-if="wrongSubmitted && index === wrongSelected && index !== current.question.answerIndex"
              class="h-5 w-5 text-red"
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          v-if="wrongSubmitted"
          class="mt-4 rounded-xl border border-border-paper bg-paper-deep p-4"
        >
          <p class="text-sm font-semibold text-indigo">
            解析 · 原文依据
          </p>
          <p class="mt-2 text-sm leading-relaxed text-ink-secondary">
            {{ current.question.rationale }}
          </p>
        </div>

        <BaseButton
          v-if="!wrongSubmitted"
          class="mt-4 w-full"
          size="lg"
          :disabled="wrongSelected === null"
          @click="submitWrongAnswer"
        >
          提交答案
        </BaseButton>
        <BaseButton
          v-else
          class="mt-4 w-full"
          size="lg"
          @click="completeCurrent"
        >
          下一项
        </BaseButton>
      </div>

      <!-- 复习卡片 -->
      <div
        v-else
        class="relative flex-1 [perspective:1200px]"
      >
        <div
          class="relative h-full min-h-[360px] transition-transform duration-300 ease-in-out"
          :class="flipped ? '[transform:rotateY(180deg)]' : ''"
          :style="{ transformStyle: 'preserve-3d' }"
        >
          <div
            class="absolute inset-0 flex flex-col rounded-2xl border border-border-paper bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)] [backface-visibility:hidden]"
          >
            <p class="text-xs text-ink-muted">
              复习 · {{ formatClauseRef(current.clause?.id ?? current.card.clauseId) }}
            </p>
            <div class="mt-6 flex flex-1 items-center justify-center">
              <p class="text-center font-serif text-[26px] leading-[1.8] text-ink">
                {{ current.clause?.text ?? formatClauseRef(current.card.clauseId) }}
              </p>
            </div>
            <div class="mt-6 text-center">
              <BaseButton
                variant="secondary"
                class="w-full"
                @click="flipped = true"
              >
                点击查看原文
              </BaseButton>
            </div>
          </div>

          <div
            class="absolute inset-0 flex flex-col rounded-2xl border border-cinnabar/40 bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <p class="text-xs text-ink-muted">
              释义
            </p>
            <div class="mt-4 flex-1 overflow-y-auto">
              <p class="font-serif text-lg leading-relaxed text-ink">
                {{ current.clause?.translation ?? '暂无译文' }}
              </p>
              <div
                v-if="selfRating"
                class="mt-4 rounded-xl bg-paper-deep p-3 text-sm text-ink-secondary"
              >
                <p
                  v-if="selfRating === 'remember'"
                  class="font-semibold text-green"
                >
                  记得
                </p>
                <p
                  v-else-if="selfRating === 'fuzzy'"
                  class="font-semibold text-gold"
                >
                  模糊
                </p>
                <p
                  v-else
                  class="font-semibold text-red"
                >
                  忘了
                </p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <BaseButton
                variant="secondary"
                class="border-red/60 text-red"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'forgot'"
              >
                忘了
              </BaseButton>
              <BaseButton
                variant="secondary"
                class="border-gold/60 text-gold"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'fuzzy'"
              >
                模糊
              </BaseButton>
              <BaseButton
                variant="primary"
                class="bg-green shadow-none hover:bg-green"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'remember'"
              >
                <Check
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                记得
              </BaseButton>
            </div>
            <BaseButton
              v-if="selfRating"
              class="mt-3 w-full"
              @click="completeCurrent"
            >
              下一项
              <RotateCcw
                class="h-4 w-4"
                aria-hidden="true"
              />
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
