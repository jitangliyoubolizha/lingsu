<script setup lang="ts">
import { Check, RotateCcw, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import type { Clause } from '../../data/types'
import { loadContent } from '../../data'
import { createCard, getTodayQueue, reviewCard } from '../../domain'
import type { MemoryCard } from '../../domain/memory'
import {
  ensureDefaultStudyPlan,
  getActiveStudyPlans,
  getAllCards,
  getClauseStates,
  getDailyLog,
  markClauseLearned,
  saveCard,
  saveDailyLog,
  saveReviewLog,
} from '../../store'
import BaseButton from '../components/BaseButton.vue'
import ProgressBar from '../components/ProgressBar.vue'

type TaskItem =
  { kind: 'new'; clause: Clause } | { kind: 'review'; card: MemoryCard; clause: Clause | undefined }

const router = useRouter()

const items = ref<TaskItem[]>([])
const currentIndex = ref(0)
const completedCount = ref(0)
const finished = ref(false)
const loading = ref(true)
const flipped = ref(false)
const selfRating = ref<'forgot' | 'fuzzy' | 'remember' | null>(null)

const todayKey = new Date().toISOString().slice(0, 10)
const current = computed(() => items.value[currentIndex.value])

const total = computed(() => items.value.length)
const progress = computed(() =>
  total.value === 0 ? 0 : ((completedCount.value + (selfRating.value ? 0 : 0)) / total.value) * 100
)

async function loadQueue() {
  try {
    const data = loadContent()
    await ensureDefaultStudyPlan()

    const [plans, cards, states] = await Promise.all([
      getActiveStudyPlans(),
      getAllCards(),
      getClauseStates(),
    ])
    const learnedIds = new Set(
      states.filter((state) => state.firstLearnedAt).map((state) => state.clauseId)
    )
    const queue = getTodayQueue(cards, plans, data.clauses, learnedIds, 20, new Date())
    const clauseById = new Map(data.clauses.map((clause) => [clause.id, clause]))

    items.value = [
      ...queue.dueCards.map((card) => ({
        kind: 'review' as const,
        card,
        clause: clauseById.get(card.clauseId),
      })),
      ...queue.newClauses.map((clause) => ({ kind: 'new' as const, clause })),
    ]

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
  }

  completedCount.value += 1
  selfRating.value = null
  flipped.value = false

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
      <span
        class="w-9"
        aria-hidden="true"
      />
    </header>

    <div class="mt-1">
      <ProgressBar :value="progress" />
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
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-green-soft text-green">
        <Check
          class="h-8 w-8"
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
          新学 · {{ current.clause.id }}
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
              复习 · {{ current.clause?.id ?? current.card.clauseId }}
            </p>
            <div class="mt-6 flex flex-1 items-center justify-center">
              <p class="text-center font-serif text-[26px] leading-[1.8] text-ink">
                {{ current.clause?.text ?? current.card.clauseId }}
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
