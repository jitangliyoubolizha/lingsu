<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import type { Herb } from '../../data/types'
import { loadMeta } from '../../data'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import SearchBar from '../components/SearchBar.vue'

const keyword = ref('')
const herbs = ref<Herb[]>([])

const groups = computed(() => {
  const keywordTrimmed = keyword.value.trim()
  const list = keywordTrimmed
    ? herbs.value.filter(
        (herb) =>
          herb.name.includes(keywordTrimmed) ||
          herb.aliases.some((alias) => alias.includes(keywordTrimmed)) ||
          (herb.category ?? '').includes(keywordTrimmed) ||
          (herb.effects ?? '').includes(keywordTrimmed)
      )
    : herbs.value

  const map = new Map<string, Herb[]>()
  for (const herb of list) {
    const category = herb.category ?? '未分类'
    const items = map.get(category) ?? []
    items.push(herb)
    map.set(category, items)
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
})

onMounted(() => {
  // 药物列表只依赖元数据（含本草卡字段），不加载条文正文
  herbs.value = loadMeta().herbs
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="中药"
      show-back
      back-to="/"
    >
      <template #actions>
        <RouterLink
          to="/search"
          class="flex h-9 items-center px-2 text-sm text-indigo"
          aria-label="搜索中药"
        >
          搜索
        </RouterLink>
      </template>
    </AppHeader>

    <SearchBar
      v-model="keyword"
      placeholder="搜索药名或功效"
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
          <RouterLink
            v-for="herb in group.items"
            :key="herb.id"
            :to="`/herbs/${herb.id}`"
            class="nav-press flex min-h-12 items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-paper-deep"
          >
            <span class="flex min-w-0 items-baseline gap-2">
              <span class="shrink-0 font-serif text-[15px] text-ink">{{ herb.name }}</span>
              <span
                v-if="herb.nature"
                class="truncate text-xs text-ink-muted"
              >{{ herb.nature }}</span>
            </span>
            <ChevronRight
              class="h-4 w-4 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </section>
    </div>

    <EmptyState
      v-if="groups.length === 0"
      title="未找到相关药物"
      description="换个关键词试试"
    />

    <p class="mt-6 text-xs leading-relaxed text-ink-muted">
      本草内容仅供学习研究，不构成医疗建议，请勿自行用药。
    </p>
  </div>
</template>
