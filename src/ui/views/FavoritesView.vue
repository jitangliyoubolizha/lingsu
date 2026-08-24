<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import type { Clause, Formula, Herb } from '../../data/types'
import { loadContent, loadMeta } from '../../data'
import { getFavorites, removeFavorite } from '../../store'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import LoadingState from '../components/LoadingState.vue'

type FavoriteType = 'clause' | 'formula' | 'herb'

const loading = ref(true)
const clauses = ref<Clause[]>([])
const formulas = ref<Formula[]>([])
const herbs = ref<Herb[]>([])

const hasAny = computed(
  () => clauses.value.length + formulas.value.length + herbs.value.length > 0
)

async function load() {
  try {
    const [favorites, content] = await Promise.all([getFavorites(), loadContent()])
    const meta = loadMeta()

    const clauseMap = new Map(content.clauses.map((clause) => [clause.id, clause]))
    const formulaMap = new Map(meta.formulas.map((formula) => [formula.id, formula]))
    const herbMap = new Map(meta.herbs.map((herb) => [herb.id, herb]))

    clauses.value = favorites
      .filter((favorite) => favorite.type === 'clause')
      .map((favorite) => clauseMap.get(favorite.targetId))
      .filter((clause): clause is Clause => clause != null)
    formulas.value = favorites
      .filter((favorite) => favorite.type === 'formula')
      .map((favorite) => formulaMap.get(favorite.targetId))
      .filter((formula): formula is Formula => formula != null)
    herbs.value = favorites
      .filter((favorite) => favorite.type === 'herb')
      .map((favorite) => herbMap.get(favorite.targetId))
      .filter((herb): herb is Herb => herb != null)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function unfavorite(type: FavoriteType, targetId: string) {
  await removeFavorite(type, targetId)
  await load()
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="我的收藏"
      show-back
      back-to="/"
    />

    <LoadingState v-if="loading" />

    <template v-else>
      <div class="space-y-6">
        <section v-if="clauses.length">
          <h2 class="mb-2 font-serif text-base font-bold text-ink">
            条文<span class="ml-1 text-xs font-normal text-ink-muted">{{ clauses.length }}</span>
          </h2>
          <div class="space-y-2">
            <div
              v-for="clause in clauses"
              :key="clause.id"
              class="flex items-start gap-2 rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
            >
              <RouterLink
                :to="`/clauses/${clause.id}`"
                class="min-w-0 flex-1"
              >
                <p class="text-xs text-ink-muted">
                  第 {{ clause.no }} 条
                </p>
                <p class="mt-1 line-clamp-2 font-serif text-[15px] leading-relaxed text-ink">
                  {{ clause.text }}
                </p>
              </RouterLink>
              <button
                type="button"
                class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep"
                aria-label="取消收藏"
                @click="unfavorite('clause', clause.id)"
              >
                <Star
                  class="h-5 w-5 fill-gold text-gold"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </section>

        <section v-if="formulas.length">
          <h2 class="mb-2 font-serif text-base font-bold text-ink">
            方剂<span class="ml-1 text-xs font-normal text-ink-muted">{{ formulas.length }}</span>
          </h2>
          <div class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
            <div
              v-for="formula in formulas"
              :key="formula.id"
              class="flex min-h-12 items-center gap-2"
            >
              <RouterLink
                :to="`/formulas/${formula.id}`"
                class="flex min-h-12 min-w-0 flex-1 items-center rounded-lg px-2"
              >
                <span class="truncate font-serif text-[17px] text-ink">{{ formula.name }}</span>
              </RouterLink>
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep"
                aria-label="取消收藏"
                @click="unfavorite('formula', formula.id)"
              >
                <Star
                  class="h-5 w-5 fill-gold text-gold"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </section>

        <section v-if="herbs.length">
          <h2 class="mb-2 font-serif text-base font-bold text-ink">
            药物<span class="ml-1 text-xs font-normal text-ink-muted">{{ herbs.length }}</span>
          </h2>
          <div class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
            <div
              v-for="herb in herbs"
              :key="herb.id"
              class="flex min-h-12 items-center gap-2"
            >
              <RouterLink
                :to="`/herbs/${herb.id}`"
                class="flex min-h-12 min-w-0 flex-1 items-center rounded-lg px-2"
              >
                <span class="truncate font-serif text-[17px] text-ink">{{ herb.name }}</span>
              </RouterLink>
              <button
                type="button"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep"
                aria-label="取消收藏"
                @click="unfavorite('herb', herb.id)"
              >
                <Star
                  class="h-5 w-5 fill-gold text-gold"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      <EmptyState
        v-if="!hasAny"
        title="暂无收藏"
        description="在条文、方剂、药物详情页点击星标即可收藏"
      />
    </template>
  </div>
</template>
