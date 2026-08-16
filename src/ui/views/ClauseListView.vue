<script setup lang="ts">
import { computed, ref } from 'vue'

import AppHeader from '../components/AppHeader.vue'
import ClauseListItem from '../components/ClauseListItem.vue'
import EmptyState from '../components/EmptyState.vue'
import TagPill from '../components/TagPill.vue'
import { clauses } from '../mockData'

type FilterKey = 'all' | 'unlearned' | 'learning' | 'mastered' | 'favorite'

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unlearned', label: '未学' },
  { key: 'learning', label: '学习中' },
  { key: 'mastered', label: '已掌握' },
  { key: 'favorite', label: '已收藏' },
]

const activeFilter = ref<FilterKey>('all')

const filtered = computed(() => {
  switch (activeFilter.value) {
    case 'unlearned':
      return clauses.filter((item) => item.status === 'unlearned')
    case 'learning':
      return clauses.filter((item) => item.status === 'learning')
    case 'mastered':
      return clauses.filter((item) => item.status === 'mastered')
    case 'favorite':
      return clauses.filter((item) => item.favorite)
    default:
      return clauses
  }
})

const learningCount = computed(() => clauses.filter((item) => item.status === 'learning').length)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="辨太阳病脉证并治上"
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
    <div class="mt-3 space-y-3">
      <ClauseListItem
        v-for="clause in filtered"
        :key="clause.id"
        :clause="clause"
      />
    </div>
    <EmptyState
      v-if="filtered.length === 0"
      title="暂无相关条文"
      description="换个筛选条件试试"
    />
  </div>
</template>
