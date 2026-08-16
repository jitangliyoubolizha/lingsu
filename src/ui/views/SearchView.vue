<script setup lang="ts">
import { computed, ref } from 'vue'

import AppHeader from '../components/AppHeader.vue'
import ComplianceBanner from '../components/ComplianceBanner.vue'
import EmptyState from '../components/EmptyState.vue'
import HighlightText from '../components/HighlightText.vue'
import SearchBar from '../components/SearchBar.vue'
import { clauses, formulas, herbs } from '../mockData'

const keyword = ref('')

const normalized = computed(() => keyword.value.trim())

const clauseResults = computed(() =>
  normalized.value
    ? clauses.filter(
        (item) => item.text.includes(normalized.value) || item.title.includes(normalized.value)
      )
    : []
)

const formulaResults = computed(() =>
  normalized.value
    ? formulas.filter(
        (item) => item.name.includes(normalized.value) || item.category.includes(normalized.value)
      )
    : []
)

const herbResults = computed(() =>
  normalized.value
    ? herbs.filter(
        (item) =>
          item.name.includes(normalized.value) ||
          item.aliases.some((alias) => alias.includes(normalized.value))
      )
    : []
)

const hasResults = computed(
  () => clauseResults.value.length + formulaResults.value.length + herbResults.value.length > 0
)
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
    />

    <div class="mt-5 space-y-6">
      <section v-if="clauseResults.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          条文（{{ clauseResults.length }}）
        </h2>
        <div class="space-y-2">
          <RouterLink
            v-for="clause in clauseResults"
            :key="clause.id"
            :to="`/clauses/${clause.id}`"
            class="block rounded-2xl border border-border-paper bg-paper-card p-4 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
          >
            <p class="text-xs text-ink-muted">
              {{ clause.title }}
            </p>
            <p class="mt-1 font-serif text-[15px] leading-relaxed text-ink">
              <HighlightText
                :text="clause.text"
                :keyword="normalized"
              />
            </p>
          </RouterLink>
        </div>
      </section>

      <section v-if="formulaResults.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          方剂（{{ formulaResults.length }}）
        </h2>
        <div
          class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2"
        >
          <RouterLink
            v-for="formula in formulaResults"
            :key="formula.id"
            :to="`/formulas/${formula.id}`"
            class="flex min-h-12 items-center justify-between rounded-lg px-2"
          >
            <span class="font-serif text-[17px] text-ink">
              <HighlightText
                :text="formula.name"
                :keyword="normalized"
              />
            </span>
            <span class="text-xs text-ink-muted">{{ formula.category }}</span>
          </RouterLink>
        </div>
      </section>

      <section v-if="herbResults.length">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          药物（{{ herbResults.length }}）
        </h2>
        <div class="space-y-2">
          <RouterLink
            v-for="herb in herbResults"
            :key="herb.id"
            :to="`/herbs/${herb.id}`"
            class="flex min-h-12 items-center justify-between rounded-xl border border-border-paper bg-paper-card px-4"
          >
            <span class="font-serif text-[17px] text-ink">
              <HighlightText
                :text="herb.name"
                :keyword="normalized"
              />
            </span>
            <span class="text-xs text-ink-muted">{{ herb.aliases.join('、') }}</span>
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

    <ComplianceBanner
      text="仅供学习研究，不构成医疗建议"
      tone="muted"
    />
  </div>
</template>
