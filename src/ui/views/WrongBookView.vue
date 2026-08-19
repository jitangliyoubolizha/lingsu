<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { QuestionType } from '../../data/types'
import { loadContent } from '../../data'
import { buildQuizDeck } from '../../domain'
import { getWrongQuestions, resolveWrongQuestion, type WrongQuestionRecord } from '../../store'
import AccordionPanel from '../components/AccordionPanel.vue'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadingState from '../components/LoadingState.vue'
import TagPill from '../components/TagPill.vue'
import { formatClauseRef, formatQuizType } from '../formatters'

type WrongItem = WrongQuestionRecord & {
  prompt: string
  type: QuestionType
  clause: string
}

interface WrongGroup {
  key: 'due' | 'upcoming' | 'mastered'
  title: string
  defaultOpen: boolean
  actionable: boolean
  items: WrongItem[]
}

const items = ref<WrongItem[]>([])
const loading = ref(true)

const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const dueToday = computed(() =>
  items.value
    .filter((item) => !item.resolved && item.dueAt.getTime() <= Date.now())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
)
const upcoming = computed(() =>
  items.value
    .filter((item) => !item.resolved && item.dueAt.getTime() > Date.now())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
)
const mastered = computed(() =>
  items.value
    .filter((item) => item.resolved)
    .sort((a, b) => b.lastWrongAt.getTime() - a.lastWrongAt.getTime())
)

const groups = computed<WrongGroup[]>(() =>
  ([
    {
      key: 'due',
      title: `今日到期（${dueToday.value.length}）`,
      defaultOpen: true,
      actionable: true,
      items: dueToday.value,
    },
    {
      key: 'upcoming',
      title: `之后到期（${upcoming.value.length}）`,
      defaultOpen: false,
      actionable: true,
      items: upcoming.value,
    },
    {
      key: 'mastered',
      title: `已掌握（${mastered.value.length}）`,
      defaultOpen: false,
      actionable: false,
      items: mastered.value,
    },
  ] as WrongGroup[]).filter((group) => group.items.length > 0)
)

function dueLabel(item: WrongItem): string {
  if (item.resolved) return '已掌握'
  if (item.dueAt.getTime() <= Date.now()) return '今日到期'
  const target = new Date(item.dueAt)
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000))
  return days <= 1 ? '明天' : `${days} 天后`
}

async function load() {
  try {
    const data = loadContent()
    const byId = new Map(buildQuizDeck(data).map((question) => [question.id, question]))
    const wrongs = await getWrongQuestions()
    items.value = wrongs
      .map((wrong) => {
        const question = byId.get(wrong.questionId)
        if (!question) return null
        return {
          ...wrong,
          prompt: question.prompt,
          type: question.type,
          clause: question.clause,
        }
      })
      .filter((item): item is WrongItem => item !== null)
  } finally {
    loading.value = false
  }
}

async function remove(questionId: string) {
  await resolveWrongQuestion(questionId)
  await load()
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="待巩固"
      show-back
      back-to="/profile"
    />

    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="items.length === 0"
      title="暂无待巩固"
      description="答错的题目会按复习排期回到这里，连续答对两次后自动移入已掌握"
    />

    <div
      v-else
      class="space-y-4"
    >
      <section
        class="grid grid-cols-3 gap-3 text-center"
        aria-label="待巩固汇总"
      >
        <div class="rounded-2xl border border-border-paper bg-paper-card p-3 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
          <p class="font-serif text-2xl font-bold text-cinnabar">
            {{ dueToday.length }}
          </p>
          <p class="mt-0.5 text-xs text-ink-muted">
            今日到期
          </p>
        </div>
        <div class="rounded-2xl border border-border-paper bg-paper-card p-3 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
          <p class="font-serif text-2xl font-bold text-gold">
            {{ upcoming.length }}
          </p>
          <p class="mt-0.5 text-xs text-ink-muted">
            之后到期
          </p>
        </div>
        <div class="rounded-2xl border border-border-paper bg-paper-card p-3 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
          <p class="font-serif text-2xl font-bold text-green">
            {{ mastered.length }}
          </p>
          <p class="mt-0.5 text-xs text-ink-muted">
            已掌握
          </p>
        </div>
      </section>

      <RouterLink
        v-if="dueToday.length"
        :to="{ path: '/quiz', query: { wrong: '1' } }"
        class="flex h-12 items-center justify-center rounded-xl bg-cinnabar text-[15px] font-semibold text-white shadow-[0_4px_10px_rgba(110,0,0,.15)] transition-transform active:scale-[0.98]"
      >
        开始巩固（{{ dueToday.length }} 道）
      </RouterLink>
      <p
        v-else
        class="rounded-2xl border border-border-paper bg-paper-card p-4 text-center text-sm text-ink-muted"
      >
        今日没有到期错题，之后到期的会按时出现在每日任务里
      </p>

      <AccordionPanel
        v-for="group in groups"
        :key="group.key"
        :title="group.title"
        :default-open="group.defaultOpen"
      >
        <div class="space-y-2">
          <div
            v-for="item in group.items"
            :key="item.questionId"
            class="rounded-xl border border-border-paper bg-paper-deep/40 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <TagPill tone="muted">
                  {{ formatQuizType(item.type) }}
                </TagPill>
                <span class="truncate text-xs text-ink-muted">
                  {{ formatClauseRef(item.clause) }}
                </span>
              </div>
              <span class="shrink-0 text-xs text-ink-muted">
                {{ dueLabel(item) }}
              </span>
            </div>

            <p class="mt-2 font-serif text-[15px] leading-relaxed text-ink">
              {{ item.prompt }}
            </p>

            <div
              v-if="group.actionable"
              class="mt-2 flex justify-end border-t border-border-paper pt-2"
            >
              <button
                type="button"
                class="flex min-h-9 items-center rounded-lg border border-border-paper bg-paper-card px-3 text-sm text-ink-secondary transition-colors hover:bg-paper-deep"
                @click="remove(item.questionId)"
              >
                已掌握
              </button>
            </div>
          </div>
        </div>
      </AccordionPanel>
    </div>
  </div>
</template>
