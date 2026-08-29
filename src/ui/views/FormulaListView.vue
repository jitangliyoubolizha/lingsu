<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { FormulaSummary } from '../../data/types'
import { loadMeta } from '../../data'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import FormulaListItem from '../components/FormulaListItem.vue'
import SearchBar from '../components/SearchBar.vue'

const keyword = ref('')
const formulas = ref<FormulaSummary[]>([])

const groups = computed(() => {
  const keywordTrimmed = keyword.value.trim()
  const list = keywordTrimmed
    ? formulas.value.filter(
        (item) => item.name.includes(keywordTrimmed) || item.category.includes(keywordTrimmed)
      )
    : formulas.value

  const map = new Map<string, FormulaSummary[]>()
  for (const formula of list) {
    const items = map.get(formula.category) ?? []
    items.push(formula)
    map.set(formula.category, items)
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
})

onMounted(() => {
  // 方剂列表只依赖元数据，不加载条文正文
  formulas.value = loadMeta().formulas
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="方剂"
      show-back
      back-to="/"
    >
      <template #actions>
        <RouterLink
          to="/compare"
          class="flex h-9 items-center px-2 text-sm text-indigo"
          aria-label="方证对比"
        >
          对比
        </RouterLink>
        <RouterLink
          to="/search"
          class="flex h-9 items-center px-2 text-sm text-indigo"
          aria-label="搜索方剂"
        >
          搜索
        </RouterLink>
      </template>
    </AppHeader>

    <SearchBar
      v-model="keyword"
      placeholder="搜索方剂名"
    />

    <div class="mt-4 space-y-5">
      <section
        v-for="group in groups"
        :key="group.category"
      >
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          {{ group.category
          }}<span class="ml-1 text-xs font-normal text-ink-muted">{{ group.items.length }}</span>
        </h2>
        <div
          class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
        >
          <FormulaListItem
            v-for="formula in group.items"
            :key="formula.id"
            :formula="formula"
          />
        </div>
      </section>
    </div>

    <EmptyState
      v-if="groups.length === 0"
      title="未找到相关方剂"
      description="换个关键词试试"
    />
  </div>
</template>
