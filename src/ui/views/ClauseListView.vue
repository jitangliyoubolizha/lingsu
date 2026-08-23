<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { Chapter, Clause } from '../../data/types'
import { loadContent } from '../../data'
import { getClauseStudyStatus } from '../../domain'
import type { MemoryCard } from '../../domain/memory'
import { getAllCards, getFavorites } from '../../store'
import AppHeader from '../components/AppHeader.vue'
import ClauseListItem from '../components/ClauseListItem.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadingState from '../components/LoadingState.vue'
import TagPill from '../components/TagPill.vue'

type FilterKey = 'all' | 'unlearned' | 'learning' | 'mastered' | 'favorite'

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unlearned', label: '未学' },
  { key: 'learning', label: '学习中' },
  { key: 'mastered', label: '已掌握' },
  { key: 'favorite', label: '已收藏' },
]

const activeFilter = ref<FilterKey>('all')
const loading = ref(true)
const chapters = ref<Chapter[]>([])
const cardByClause = ref<Map<string, MemoryCard>>(new Map())
const favoriteIds = ref<Set<string>>(new Set())
const collapsedChapters = ref<Set<string>>(new Set())

function statusOf(clause: Clause): 'unlearned' | 'learning' | 'mastered' {
  return getClauseStudyStatus(cardByClause.value.get(clause.id))
}

interface ChapterGroup {
  chapter: Chapter
  filtered: Clause[]
}

const grouped = computed<ChapterGroup[]>(() => {
  return chapters.value
    .map((chapter) => {
      const filtered = chapter.clauses.filter((clause) => {
        const status = statusOf(clause)
        switch (activeFilter.value) {
          case 'unlearned':
            return status === 'unlearned'
          case 'learning':
            return status === 'learning'
          case 'mastered':
            return status === 'mastered'
          case 'favorite':
            return favoriteIds.value.has(clause.id)
          default:
            return true
        }
      })
      return { chapter, filtered }
    })
    .filter((group) => group.filtered.length > 0)
})

const totalClauses = computed(() =>
  chapters.value.reduce((sum, ch) => sum + ch.clauses.length, 0)
)

const totalFiltered = computed(() =>
  grouped.value.reduce((sum, g) => sum + g.filtered.length, 0)
)

const chapterCount = computed(() => chapters.value.length)

function toggleChapter(code: string) {
  const next = new Set(collapsedChapters.value)
  if (next.has(code)) {
    next.delete(code)
  } else {
    next.add(code)
  }
  collapsedChapters.value = next
}

async function load() {
  try {
    const data = await loadContent()
    chapters.value = data.chapters
    const [cards, favorites] = await Promise.all([getAllCards(), getFavorites()])
    cardByClause.value = new Map(cards.map((card) => [card.clauseId, card]))
    favoriteIds.value = new Set(
      favorites
        .filter((favorite) => favorite.type === 'clause')
        .map((favorite) => favorite.targetId)
    )
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="全部条文"
      :subtitle="`《伤寒论》宋本 · 共 ${totalClauses} 条 · ${chapterCount} 篇`"
      show-back
      back-to="/"
    />
    <div
      class="flex gap-2 overflow-x-auto pb-1"
      role="tablist"
      aria-label="条文筛选"
    >
      <TagPill
        v-for="filter in filters"
        :key="filter.key"
        :active="activeFilter === filter.key"
        clickable
        @click="activeFilter = filter.key"
      >
        {{ filter.label }}
      </TagPill>
    </div>
    <p class="mt-3 text-xs text-ink-muted">
      共 {{ totalFiltered }} 条 · {{ grouped.length }} 篇
    </p>
    <LoadingState v-if="loading" />
    <div
      v-else
      class="mt-3 space-y-3"
    >
      <section
        v-for="group in grouped"
        :key="group.chapter.code"
        class="overflow-hidden rounded-2xl border border-border-paper bg-paper-card"
      >
        <button
          type="button"
          class="zhusi-rule flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left"
          :aria-expanded="!collapsedChapters.has(group.chapter.code)"
          role="button"
          @click="toggleChapter(group.chapter.code)"
        >
          <span class="flex-1 font-serif text-base font-semibold text-ink">
            {{ group.chapter.name }}
          </span>
          <span class="text-xs text-ink-muted">
            {{ group.filtered.length }} / {{ group.chapter.clauses.length }} 条
          </span>
          <svg
            class="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200"
            :class="collapsedChapters.has(group.chapter.code) ? '' : 'rotate-180'"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div
          v-show="!collapsedChapters.has(group.chapter.code)"
          class="border-t border-border-paper px-4 py-3"
        >
          <ClauseListItem
            v-for="clause in group.filtered"
            :key="clause.id"
            :clause="clause"
            :status="statusOf(clause)"
            :favorite="favoriteIds.has(clause.id)"
          />
        </div>
      </section>
    </div>
    <EmptyState
      v-if="!loading && grouped.length === 0"
      title="暂无相关条文"
      description="换个筛选条件试试"
    />
  </div>
</template>