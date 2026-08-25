<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import type { ContentData } from '../../data/types'
import { loadAllFormulas, loadMeta } from '../../data'
import { getHerbFormulaIds } from '../../domain'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'

const route = useRoute()
const content = ref<ContentData>()
const loaded = ref(false)

const herbId = computed(() => String(route.params.id))
const herb = computed(() => content.value?.herbs.find((item) => item.id === herbId.value))
const formulaIds = computed(() =>
  content.value ? getHerbFormulaIds(herbId.value, content.value) : []
)

function formulaName(id: string): string {
  return content.value?.formulas.find((formula) => formula.id === id)?.name ?? id
}

onMounted(async () => {
  // 药物反查方剂依赖完整方剂组成，按需加载；药物/术语在元数据中，不加载条文正文
  const meta = loadMeta()
  const formulas = await loadAllFormulas()
  content.value = { ...meta, formulas, chapters: [], clauses: [] }
  loaded.value = true
})
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="药物详情"
      show-back
      back-to="/search"
    />

    <EmptyState
      v-if="loaded && !herb"
      title="未找到该药物"
      description="请返回搜索页重新选择"
    />

    <template v-else-if="herb">
      <h1 class="font-serif text-3xl font-bold text-ink">
        {{ herb.name }}
      </h1>
      <p
        v-if="herb.aliases.length"
        class="mt-1 text-sm text-ink-muted"
      >
        别名：{{ herb.aliases.join('、') }}
      </p>

      <section
        class="mt-6 rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-2 text-sm font-semibold text-ink-secondary">
          出现方剂
        </h2>
        <div class="divide-y divide-border-paper">
          <RouterLink
            v-for="formulaId in formulaIds"
            :key="formulaId"
            :to="`/formulas/${formulaId}`"
            class="flex min-h-12 items-center justify-between rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          >
            <span class="font-serif">{{ formulaName(formulaId) }}</span>
            <ChevronRight
              class="h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </section>

      <p class="mt-4 text-xs leading-relaxed text-ink-muted">
        本页仅展示药物出现在哪些方剂中，不提供功效与主治描述。
      </p>
    </template>
  </div>
</template>
