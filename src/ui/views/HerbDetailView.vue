<script setup lang="ts">
import { ChevronRight, Star, TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import type { ContentData } from '../../data/types'
import { loadAllFormulas, loadMeta } from '../../data'
import { getHerbFormulaIds } from '../../domain'
import { addFavorite, isFavorite, removeFavorite } from '../../store'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import TagPill from '../components/TagPill.vue'

const route = useRoute()
const content = ref<ContentData>()
const loaded = ref(false)
const favorite = ref(false)

const herbId = computed(() => String(route.params.id))
const herb = computed(() => content.value?.herbs.find((item) => item.id === herbId.value))
const formulaIds = computed(() =>
  content.value ? getHerbFormulaIds(herbId.value, content.value) : []
)

function formulaName(id: string): string {
  return content.value?.formulas.find((formula) => formula.id === id)?.name ?? id
}

/** 本草卡要点行：字段可缺省，有则展示。 */
const properties = computed(() => {
  const entry = herb.value
  if (!entry) return []
  const rows: Array<{ label: string; value: string }> = []
  if (entry.nature) rows.push({ label: '性味', value: entry.nature })
  if (entry.meridians?.length) rows.push({ label: '归经', value: entry.meridians.join('、') })
  if (entry.effects) rows.push({ label: '功效', value: entry.effects })
  if (entry.dosage) rows.push({ label: '用量参考', value: `${entry.dosage}（仅供参考）` })
  return rows
})

onMounted(async () => {
  // 药物反查方剂依赖完整方剂组成，按需加载；药物/术语在元数据中，不加载条文正文
  const meta = loadMeta()
  const formulas = await loadAllFormulas()
  content.value = { ...meta, formulas, chapters: [], clauses: [] }
  favorite.value = await isFavorite('herb', herbId.value)
  loaded.value = true
})

async function toggleFavorite() {
  if (!herb.value) return
  if (favorite.value) {
    await removeFavorite('herb', herb.value.id)
    favorite.value = false
  } else {
    await addFavorite('herb', herb.value.id)
    favorite.value = true
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="药物详情"
      show-back
      back-to="/herbs"
    >
      <template #actions>
        <button
          v-if="herb"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          :aria-label="favorite ? '取消收藏' : '收藏药物'"
          @click="toggleFavorite"
        >
          <Star
            class="h-5 w-5"
            :class="favorite ? 'fill-gold text-gold' : ''"
            aria-hidden="true"
          />
        </button>
      </template>
    </AppHeader>

    <EmptyState
      v-if="loaded && !herb"
      title="未找到该药物"
      description="请返回中药列表重新选择"
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

      <div class="mt-2 flex flex-wrap items-center gap-2">
        <TagPill
          v-if="herb.category"
          tone="default"
        >
          {{ herb.category }}
        </TagPill>
        <RouterLink
          :to="{ path: '/graph', query: { focus: `h:${herb.id}` } }"
          class="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
          aria-label="在知识图谱中查看该药物"
        >
          ⊙ 在图谱中查看
        </RouterLink>
      </div>

      <section
        v-if="properties.length"
        class="mt-5 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-3 font-serif text-base font-bold">
          本草卡
        </h2>
        <dl class="divide-y divide-border-paper">
          <div
            v-for="row in properties"
            :key="row.label"
            class="flex gap-3 py-2.5"
          >
            <dt class="w-16 shrink-0 pt-0.5 text-xs text-ink-muted">
              {{ row.label }}
            </dt>
            <dd class="font-serif text-[15px] leading-relaxed text-ink">
              {{ row.value }}
            </dd>
          </div>
        </dl>
        <p
          v-if="herb.cautions"
          class="mt-3 flex items-start gap-2 rounded-lg bg-cinnabar-soft p-3 text-xs leading-relaxed text-cinnabar"
        >
          <TriangleAlert
            class="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>使用注意：{{ herb.cautions }}</span>
        </p>
      </section>

      <section
        v-if="herb.applications"
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-2 font-serif text-base font-bold">
          经方应用
        </h2>
        <p class="text-sm leading-relaxed text-ink-secondary">
          {{ herb.applications }}
        </p>
      </section>

      <section
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-2 text-sm font-semibold text-ink-secondary">
          出现方剂
        </h2>
        <div class="divide-y divide-border-paper">
          <RouterLink
            v-for="formulaId in formulaIds"
            :key="formulaId"
            :to="`/formulas/${formulaId}`"
            class="nav-press flex min-h-12 items-center justify-between rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          >
            <span class="font-serif">{{ formulaName(formulaId) }}</span>
            <ChevronRight
              class="h-4 w-4 text-ink-muted"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </section>

      <div
        class="mt-6 flex items-start gap-2 rounded-xl bg-cinnabar-soft p-3 text-xs text-cinnabar"
      >
        <TriangleAlert
          class="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <p>仅供学习研究，不构成医疗建议，请勿自行用药。</p>
      </div>
    </template>
  </div>
</template>
