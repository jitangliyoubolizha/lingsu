<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import type { ContentData } from '../../data/types'
import { loadContent } from '../../data'
import {
  buildSearchIndex,
  groupSearchResults,
  searchContent,
  type SearchIndex,
  type SearchResultItem,
} from '../../domain'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import HighlightText from '../components/HighlightText.vue'
import SearchBar from '../components/SearchBar.vue'

const keyword = ref('')
const index = ref<SearchIndex>()
const content = ref<ContentData>()
const results = ref<SearchResultItem[]>([])

const normalized = computed(() => keyword.value.trim())

const grouped = computed(() => groupSearchResults(results.value))

const hasResults = computed(() => results.value.length > 0)

onMounted(async () => {
  const data = await loadContent()
  content.value = data
  index.value = buildSearchIndex(data)
})

function search() {
  if (!index.value || !normalized.value) {
    results.value = []
    return
  }
  results.value = searchContent(index.value, normalized.value)
}
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="搜索"
      show-back
      back-to="/"
    />

    <SearchBar
      v-model="keyword"
      placeholder="输入关键词，如：发热、桂枝"
      autofocus
      @submit="search"
    />

    <div class="mt-5 space-y-6">
      <section v-if="grouped.clauses.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          条文（{{ grouped.clauses.length }}）
        </h2>
        <div class="space-y-2">
          <RouterLink
            v-for="item in grouped.clauses"
            :key="item.id"
            :to="`/clauses/${item.id}`"
            class="block rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
          >
            <p class="text-xs text-ink-muted">
              {{ item.title }}
            </p>
            <p class="mt-1 font-serif text-[15px] leading-relaxed text-ink">
              <HighlightText
                :text="item.text"
                :keyword="normalized"
              />
            </p>
          </RouterLink>
        </div>
      </section>

      <section v-if="grouped.formulas.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          方剂（{{ grouped.formulas.length }}）
        </h2>
        <div
          class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2"
        >
          <RouterLink
            v-for="item in grouped.formulas"
            :key="item.id"
            :to="`/formulas/${item.id}`"
            class="flex min-h-12 items-center justify-between rounded-lg px-2"
          >
            <span class="font-serif text-[17px] text-ink">
              <HighlightText
                :text="item.title"
                :keyword="normalized"
              />
            </span>
            <span class="text-xs text-ink-muted">方剂</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="grouped.herbs.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          药物（{{ grouped.herbs.length }}）
        </h2>
        <div class="space-y-2">
          <RouterLink
            v-for="item in grouped.herbs"
            :key="item.id"
            :to="`/herbs/${item.id}`"
            class="flex min-h-12 items-center justify-between rounded-xl border border-border-paper bg-paper-card px-4"
          >
            <span class="font-serif text-[17px] text-ink">
              <HighlightText
                :text="item.title"
                :keyword="normalized"
              />
            </span>
            <span class="text-xs text-ink-muted">药物</span>
          </RouterLink>
        </div>
      </section>
    </div>

    <EmptyState
      v-if="normalized && !hasResults"
      title="未找到相关内容"
      description="试试更短的关键词"
    />
    <p
      v-if="!normalized"
      class="mt-10 text-center text-sm text-ink-muted"
    >
      输入关键词搜索条文、方剂与药物
    </p>
  </div>
</template>
