<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { Clause } from '../../data/types'
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
const clauses = ref<Clause[]>([])
const cardByClause = ref<Map<string, MemoryCard>>(new Map())
const favoriteIds = ref<Set<string>>(new Set())

function statusOf(clause: Clause): 'unlearned' | 'learning' | 'mastered' {
  return getClauseStudyStatus(cardByClause.value.get(clause.id))
}

const filtered = computed(() => {
  return clauses.value.filter((clause) => {
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
})

const learningCount = computed(
  () => clauses.value.filter((clause) => statusOf(clause) === 'learning').length
)

async function load() {
  try {
    const data = await loadContent()
    clauses.value = data.clauses
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
      subtitle="太阳病上/中/下篇 · 共 178 条"
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
      共 {{ filtered.length }} 条 · 学习中 {{ learningCount }} 条
    </p>
    <LoadingState v-if="loading" />
    <div
      v-else
      class="mt-3 space-y-3"
    >
      <ClauseListItem
        v-for="clause in filtered"
        :key="clause.id"
        :clause="clause"
        :status="statusOf(clause)"
        :favorite="favoriteIds.has(clause.id)"
      />
    </div>
    <EmptyState
      v-if="!loading && filtered.length === 0"
      title="暂无相关条文"
      description="换个筛选条件试试"
    />
  </div>
</template>
