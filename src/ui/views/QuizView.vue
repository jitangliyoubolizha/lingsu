<script setup lang="ts">
import { BookOpen, Check, X } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import type { Question } from '../../data/types'
import { loadContent } from '../../data'
import { generateAutoQuestions } from '../../domain'
import { addQuizLog, addWrongQuestion } from '../../store'
import AppHeader from '../components/AppHeader.vue'
import BaseButton from '../components/BaseButton.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadingState from '../components/LoadingState.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { formatClauseRef, formatQuizType } from '../formatters'

type QuizItem = Pick<
  Question,
  'id' | 'type' | 'clause' | 'formula' | 'prompt' | 'options' | 'answerIndex' | 'rationale'
>

const questions = ref<QuizItem[]>([])
const currentIndex = ref(0)
const selected = ref<number | null>(null)
const submitted = ref(false)
const loading = ref(true)

const current = computed<QuizItem | undefined>(() => questions.value[currentIndex.value])
const total = computed(() => questions.value.length)

async function submit() {
  if (selected.value === null || !current.value) return
  submitted.value = true
  const correct = selected.value === current.value.answerIndex
  await addQuizLog({
    questionId: current.value.id,
    type: current.value.type,
    correct,
    answeredAt: new Date(),
  })
  if (!correct) {
    await addWrongQuestion(current.value.id, new Date())
  }
}

function next() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value += 1
    selected.value = null
    submitted.value = false
  } else {
    currentIndex.value = 0
    selected.value = null
    submitted.value = false
  }
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
  const data = loadContent()
  const reviewed: QuizItem[] = data.questions
  const auto: QuizItem[] = generateAutoQuestions(data)
  const seen = new Set<string>()
  questions.value = [...reviewed, ...auto].filter((question) => {
    if (seen.has(question.id)) return false
    seen.add(question.id)
    return true
  })
  loading.value = false
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="刷题"
      show-back
      back-to="/"
    />

    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="questions.length === 0"
      title="暂无可刷题目"
      description="请先完成内容录入或稍后再试"
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
          {{ currentIndex === total - 1 ? '重新开始' : '下一题' }}
        </BaseButton>
      </section>
    </template>
  </div>
</template>
