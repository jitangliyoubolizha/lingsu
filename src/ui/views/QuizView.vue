<script setup lang="ts">
import { BookOpen, Check, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import type { Question, QuestionType } from '../../data/types'
import { loadContent } from '../../data'
import { buildQuizDeck, filterQuizDeck, shuffleDeck } from '../../domain'
import {
  addQuizLog,
  addWrongQuestion,
  getDueWrongQuestions,
  markWrongCorrect,
} from '../../store'
import AppHeader from '../components/AppHeader.vue'
import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadingState from '../components/LoadingState.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { formatChapterCode, formatClauseRef, formatQuizType } from '../formatters'

type QuizItem = Pick<
  Question,
  'id' | 'type' | 'clause' | 'formula' | 'prompt' | 'options' | 'answerIndex' | 'rationale'
>

const QUESTION_TYPES: QuestionType[] = [
  'fill_blank',
  'clause_chain',
  'formula_syndrome_match',
  'formula_composition',
]

interface QuizMode {
  wrong: boolean
  random: boolean
  chapter?: string
  type?: QuestionType
}

const route = useRoute()
const questions = ref<QuizItem[]>([])
const currentIndex = ref(0)
const selected = ref<number | null>(null)
const submitted = ref(false)
const loading = ref(true)
const lastCorrect = ref(false)

const stage = ref<'picker' | 'quiz'>('picker')
const mode = ref<QuizMode>({ wrong: false, random: false })

const chapters = computed(() => {
  const data = loadContent()
  const seen = new Set<string>()
  return data.chapters
    .slice()
    .sort((a, b) => a.order - b.order)
    .filter((chapter) => {
      if (seen.has(chapter.code)) return false
      seen.add(chapter.code)
      return true
    })
    .map((chapter) => ({ code: chapter.code, label: formatChapterCode(chapter.code) }))
})

const pageTitle = computed(() => {
  if (stage.value === 'picker') return '刷题'
  if (mode.value.wrong) return '错题重做'
  if (mode.value.random) return '随机综合'
  if (mode.value.chapter) return `刷题 · ${formatChapterCode(mode.value.chapter)}`
  if (mode.value.type) return `刷题 · ${formatQuizType(mode.value.type)}`
  return '刷题'
})
const current = computed<QuizItem | undefined>(() => questions.value[currentIndex.value])
const total = computed(() => questions.value.length)
const nextLabel = computed(() => {
  if (mode.value.wrong && lastCorrect.value && currentIndex.value === total.value - 1) {
    return '完成'
  }
  if (currentIndex.value === total.value - 1) {
    return '重新开始'
  }
  return '下一题'
})
const emptyText = computed(() =>
  mode.value.wrong
    ? { title: '错题已清空', description: '错题重做正确后已移出错题本' }
    : { title: '该筛选下暂无题目', description: '换一个篇章或题型试试' }
)

function parseQueryMode(): QuizMode | null {
  if (route.query.wrong === '1') return { wrong: true, random: false }
  if (route.query.mode === 'random') return { wrong: false, random: true }
  const chapter = typeof route.query.chapter === 'string' ? route.query.chapter : undefined
  const type =
    typeof route.query.type === 'string' &&
    QUESTION_TYPES.includes(route.query.type as QuestionType)
      ? (route.query.type as QuestionType)
      : undefined
  if (chapter !== undefined || type !== undefined) {
    return { wrong: false, random: false, chapter, type }
  }
  return null
}

async function startQuiz(next: QuizMode) {
  loading.value = true
  mode.value = next
  stage.value = 'quiz'

  const data = loadContent()
  let deck: QuizItem[] = buildQuizDeck(data)
  if (next.chapter !== undefined || next.type !== undefined) {
    deck = filterQuizDeck(deck, data, { chapter: next.chapter, type: next.type })
  }
  if (next.random) {
    deck = shuffleDeck(deck)
  }
  if (next.wrong) {
    const wrongs = await getDueWrongQuestions()
    const wrongIds = new Set(wrongs.map((item) => item.questionId))
    deck = deck.filter((question) => wrongIds.has(question.id))
  }
  questions.value = deck
  currentIndex.value = 0
  selected.value = null
  submitted.value = false
  loading.value = false
}

async function submit() {
  if (selected.value === null || !current.value) return
  submitted.value = true
  const correct = selected.value === current.value.answerIndex
  lastCorrect.value = correct
  await addQuizLog({
    questionId: current.value.id,
    type: current.value.type,
    correct,
    answeredAt: new Date(),
  })
  if (!correct) {
    await addWrongQuestion(current.value.id, new Date())
  } else {
    await markWrongCorrect(current.value.id, new Date())
  }
}

function next() {
  if (mode.value.wrong && lastCorrect.value) {
    questions.value.splice(currentIndex.value, 1)
    if (questions.value.length === 0) {
      currentIndex.value = 0
      selected.value = null
      submitted.value = false
      lastCorrect.value = false
      return
    }
    if (currentIndex.value >= questions.value.length) {
      currentIndex.value = questions.value.length - 1
    }
  } else if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1
  } else {
    currentIndex.value = 0
  }
  selected.value = null
  submitted.value = false
  lastCorrect.value = false
}

function optionClass(index: number) {
  if (!submitted.value) {
    return selected.value === index
      ? 'border-cinnabar bg-cinnabar-soft'
      : 'border-border-paper bg-paper-card'
  }
  if (index === current.value?.answerIndex) return 'border-green bg-green-soft'
  if (index === selected.value) return 'border-red bg-cinnabar-soft'
  return 'border-border-paper bg-paper-card opacity-60'
}

onMounted(() => {
  const direct = parseQueryMode()
  if (direct) {
    void startQuiz(direct)
  } else {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      :title="pageTitle"
      show-back
      back-to="/"
    />

    <LoadingState v-if="loading" />

    <section
      v-else-if="stage === 'picker'"
      class="space-y-5"
    >
      <div class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]">
        <p class="text-sm text-ink-secondary">
          全部题型随机混刷，每轮选项顺序随机。
        </p>
        <BaseButton
          class="mt-4 w-full"
          size="lg"
          @click="startQuiz({ wrong: false, random: true })"
        >
          随机综合
        </BaseButton>
      </div>

      <div class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]">
        <p class="text-sm font-semibold text-ink">
          按篇刷题
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="chapter in chapters"
            :key="chapter.code"
            type="button"
            class="rounded-full border border-border-paper bg-paper-deep px-4 py-2 text-sm text-ink transition-colors duration-200 hover:border-cinnabar hover:text-cinnabar"
            @click="startQuiz({ wrong: false, random: false, chapter: chapter.code })"
          >
            {{ chapter.label }}
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]">
        <p class="text-sm font-semibold text-ink">
          按题型刷题
        </p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="type in QUESTION_TYPES"
            :key="type"
            type="button"
            class="rounded-full border border-border-paper bg-paper-deep px-4 py-2 text-sm text-ink transition-colors duration-200 hover:border-cinnabar hover:text-cinnabar"
            @click="startQuiz({ wrong: false, random: false, type })"
          >
            {{ formatQuizType(type) }}
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]">
        <p class="text-sm font-semibold text-ink">
          待巩固错题
        </p>
        <p class="mt-1 text-xs text-ink-muted">
          只重做今日到期的错题，答对移出排期。
        </p>
        <BaseButton
          class="mt-4 w-full"
          variant="secondary"
          @click="startQuiz({ wrong: true, random: false })"
        >
          待巩固错题
        </BaseButton>
      </div>
    </section>

    <template v-else>
      <EmptyState
        v-if="questions.length === 0"
        :title="emptyText.title"
        :description="emptyText.description"
      />

      <template v-else>
        <div class="flex items-center justify-between text-xs text-ink-muted">
          <span>第 {{ currentIndex + 1 }} 题 / 共 {{ total }} 题</span>
          <span>{{ formatQuizType(current?.type ?? '') }}</span>
        </div>
        <ProgressBar
          class="mt-2"
          :value="((currentIndex + 1) / total) * 100"
        />

        <section
          class="mt-5 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]"
        >
          <p class="font-serif text-[22px] leading-relaxed text-ink">
            {{ current?.prompt }}
          </p>

          <div class="mt-5 space-y-3">
            <button
              v-for="(option, index) in current?.options ?? []"
              :key="index"
              type="button"
              class="flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 text-left text-[15px] transition-colors duration-200"
              :class="optionClass(index)"
              :disabled="submitted"
              @click="selected = index"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-deep text-sm font-semibold text-ink-secondary"
                :class="
                  submitted && index === current?.answerIndex
                    ? 'bg-green text-white'
                    : submitted && index === selected
                      ? 'bg-red text-white'
                      : ''
                "
              >
                {{ String.fromCharCode(65 + index) }}
              </span>
              <span class="flex-1">{{ option }}</span>
              <Check
                v-if="submitted && index === current?.answerIndex"
                class="h-5 w-5 text-green"
                aria-hidden="true"
              />
              <X
                v-else-if="submitted && index === selected && index !== current?.answerIndex"
                class="h-5 w-5 text-red"
                aria-hidden="true"
              />
            </button>
          </div>

          <div
            v-if="submitted"
            class="mt-4 rounded-xl border border-border-paper bg-paper-deep p-4"
          >
            <p class="flex items-center gap-1.5 text-sm font-semibold text-indigo">
              <BookOpen
                class="h-4 w-4"
                aria-hidden="true"
              />
              解析 · 原文依据
            </p>
            <p class="mt-2 text-sm leading-relaxed text-ink-secondary">
              {{ current?.rationale }}
            </p>
            <p class="mt-1 text-xs text-ink-muted">
              来源：{{ formatClauseRef(current?.clause ?? '') }}
            </p>
          </div>

          <BaseButton
            v-if="!submitted"
            class="mt-5 w-full"
            size="lg"
            :disabled="selected === null"
            @click="submit"
          >
            提交答案
          </BaseButton>
          <BaseButton
            v-else
            class="mt-5 w-full"
            size="lg"
            @click="next"
          >
            {{ nextLabel }}
          </BaseButton>
        </section>
      </template>
    </template>
  </div>
</template>
