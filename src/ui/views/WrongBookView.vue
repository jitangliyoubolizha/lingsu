<script setup lang="ts">
import { onMounted, ref } from 'vue'

import type { QuestionType } from '../../data/types'
import { loadContent } from '../../data'
import { buildQuizDeck } from '../../domain'
import { getWrongQuestions, resolveWrongQuestion, type WrongQuestionRecord } from '../../store'
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

const items = ref<WrongItem[]>([])
const loading = ref(true)

async function load() {
  try {
    const data = loadContent()
    const byId = new Map(buildQuizDeck(data).map((question) => [question.id, question]))
    const wrongs = await getWrongQuestions()
    items.value = wrongs
      .filter((wrong) => !wrong.resolved)
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
      .sort((a, b) => b.lastWrongAt.getTime() - a.lastWrongAt.getTime())
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
      title="错题本"
      show-back
      back-to="/profile"
    />

    <LoadingState v-if="loading" />
    <EmptyState
      v-else-if="items.length === 0"
      title="暂无错题"
      description="刷题答错的题目会自动收进这里，答对后可移出"
    />

    <div
      v-else
      class="space-y-3"
    >
      <section
        v-for="item in items"
        :key="item.questionId"
        class="rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
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
          <span class="shrink-0 text-xs font-medium text-cinnabar">
            答错 {{ item.wrongCount }} 次
          </span>
        </div>

        <p class="mt-3 font-serif text-[15px] leading-relaxed text-ink">
          {{ item.prompt }}
        </p>

        <div class="mt-3 flex items-center justify-end gap-3 border-t border-border-paper pt-3">
          <RouterLink
            :to="{ path: '/quiz', query: { wrong: '1' } }"
            class="flex min-h-9 items-center rounded-lg bg-cinnabar px-4 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            重做
          </RouterLink>
          <button
            type="button"
            class="flex min-h-9 items-center rounded-lg border border-border-paper bg-paper-card px-4 text-sm text-ink-secondary transition-colors hover:bg-paper-deep"
            @click="remove(item.questionId)"
          >
            移出错题本
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
