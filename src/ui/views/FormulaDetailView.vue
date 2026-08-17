<script setup lang="ts">
import { Star, TriangleAlert } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import type { ContentData, Formula } from '../../data/types'
import { loadContent } from '../../data'
import { deriveFormulaFields } from '../../domain'
import { addFavorite, isFavorite, removeFavorite } from '../../store'
import AccordionPanel from '../components/AccordionPanel.vue'
import AppHeader from '../components/AppHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import TagPill from '../components/TagPill.vue'

const route = useRoute()
const content = ref<ContentData>()
const formula = ref<Formula>()
const favorite = ref(false)
const loaded = ref(false)

const formulaId = computed(() => String(route.params.id))
const derived = computed(() =>
  formula.value && content.value ? deriveFormulaFields(formula.value, content.value) : undefined
)

function herbName(id: string): string {
  return content.value?.herbs.find((herb) => herb.id === id)?.name ?? id
}

function clauseTitle(id: string): string {
  return content.value?.clauses.find((clause) => clause.id === id) ? `条文 ${id}` : id
}

function formulaName(id: string): string {
  return content.value?.formulas.find((item) => item.id === id)?.name ?? id
}

async function load() {
  const data = loadContent()
  content.value = data
  formula.value = data.formulas.find((item) => item.id === formulaId.value)
  if (formula.value) {
    favorite.value = await isFavorite('formula', formula.value.id)
  }
  loaded.value = true
}

async function toggleFavorite() {
  if (!formula.value) return
  if (favorite.value) {
    await removeFavorite('formula', formula.value.id)
    favorite.value = false
  } else {
    await addFavorite('formula', formula.value.id)
    favorite.value = true
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="方剂详情"
      show-back
      back-to="/formulas"
    >
      <template #actions>
        <button
          v-if="formula"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          :aria-label="favorite ? '取消收藏' : '收藏方剂'"
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
      v-if="loaded && !formula"
      title="未找到该方剂"
      description="请返回方剂列表重新选择"
    />

    <template v-else-if="formula && content && derived">
      <h1 class="font-serif text-3xl font-bold text-ink">
        {{ formula.name }}
      </h1>
      <div class="mt-2 flex flex-wrap gap-2">
        <TagPill tone="default">
          {{ formula.category }}
        </TagPill>
        <TagPill tone="muted">
          《伤寒论》
        </TagPill>
      </div>

      <section
        class="mt-5 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-3 font-serif text-base font-bold">
          组成
        </h2>
        <ul class="divide-y divide-border-paper">
          <li
            v-for="item in formula.composition"
            :key="item.herb"
            class="flex items-center justify-between py-2.5"
          >
            <span class="font-serif text-[15px] text-ink">{{ herbName(item.herb) }}</span>
            <span class="text-[13px] text-ink-muted">{{ item.dose }}</span>
          </li>
        </ul>
        <p class="mt-3 rounded-lg bg-paper-deep p-3 text-xs leading-relaxed text-ink-secondary">
          {{ formula.originalDoseText }}
        </p>
      </section>

      <section
        v-if="derived.mainSymptoms.length || derived.pulse.length || derived.pathomechanism"
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4"
      >
        <h2 class="text-sm font-semibold text-ink-secondary">
          自动推导
        </h2>
        <div class="mt-2 flex flex-wrap gap-2">
          <TagPill
            v-for="id in derived.mainSymptoms"
            :key="id"
            tone="default"
          >
            {{ content.symptomTerms.find((term) => term.id === id)?.name ?? id }}
          </TagPill>
        </div>
        <p
          v-if="derived.pathomechanism"
          class="mt-2 text-sm text-ink-secondary"
        >
          病机：{{ derived.pathomechanism }}
        </p>
      </section>

      <div class="mt-4 space-y-3">
        <AccordionPanel title="现代剂量参考">
          <div class="rounded-xl bg-cinnabar-soft p-3">
            <p class="flex items-center gap-1 text-sm font-bold text-cinnabar">
              <TriangleAlert
                class="h-4 w-4"
                aria-hidden="true"
              />
              学术探讨，非用药指导
            </p>
            <p class="mt-1 text-xs text-ink-secondary">
              {{ formula.doseReference }}
            </p>
          </div>
        </AccordionPanel>

        <AccordionPanel
          title="煎服法"
          :default-open="true"
        >
          <p class="text-sm leading-relaxed text-ink-secondary">
            {{ formula.decoction }}
          </p>
        </AccordionPanel>
      </div>

      <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
        <h2 class="text-sm font-semibold text-ink-secondary">
          相关条文
        </h2>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="clauseId in formula.relatedClauses"
            :key="clauseId"
            :to="`/clauses/${clauseId}`"
            class="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm text-indigo hover:bg-paper-deep"
          >
            <span>{{ clauseTitle(clauseId) }}</span>
            <span class="text-xs text-ink-muted">查看</span>
          </RouterLink>
        </div>
      </section>

      <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
        <h2 class="text-sm font-semibold text-ink-secondary">
          类方关系
        </h2>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="relation in formula.relatedFormulas"
            :key="relation.target"
            :to="`/formulas/${relation.target}`"
            class="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm text-indigo hover:bg-paper-deep"
          >
            <span>{{ formulaName(relation.target) }}</span>
            <span class="text-xs text-ink-muted">{{ relation.relation }}</span>
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
        <p>{{ formula.safetyNotice }}</p>
      </div>
    </template>
  </div>
</template>
