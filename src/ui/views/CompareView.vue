<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'

import type { ContentData, Formula } from '../../data/types'
import { loadContent } from '../../data'
import { deriveFormulaFields } from '../../domain'
import AppHeader from '../components/AppHeader.vue'
import TagPill from '../components/TagPill.vue'

interface CompareRow {
  formula: Formula
  composition: string[]
  mainSymptoms: string[]
  pulse: string[]
  pathomechanism: string
  relatedClauses: string[]
}

const content = ref<ContentData>()
const selectedIds = ref<string[]>([])
const rows = ref<CompareRow[]>([])

const dimensions = [
  { key: 'composition', label: '组成' },
  { key: 'mainSymptoms', label: '核心主症' },
  { key: 'pulse', label: '脉象' },
  { key: 'pathomechanism', label: '病机' },
  { key: 'relatedClauses', label: '相关条文' },
] as const

function herbName(id: string): string {
  return content.value?.herbs.find((herb) => herb.id === id)?.name ?? id
}

function symptomName(id: string): string {
  return content.value?.symptomTerms.find((term) => term.id === id)?.name ?? id
}

function buildRows() {
  if (!content.value) return
  rows.value = selectedIds.value
    .map((id) => content.value?.formulas.find((formula) => formula.id === id))
    .filter((formula): formula is Formula => Boolean(formula))
    .map((formula) => {
      const derived = deriveFormulaFields(formula, content.value!)
      return {
        formula,
        composition: formula.composition.map((item) => herbName(item.herb)),
        mainSymptoms: derived.mainSymptoms.map(symptomName),
        pulse: derived.pulse.map(symptomName),
        pathomechanism: derived.pathomechanism || '待补充',
        relatedClauses: formula.relatedClauses,
      }
    })
}

function removeFormula(id: string) {
  selectedIds.value = selectedIds.value.filter((item) => item !== id)
  buildRows()
}

function cellValue(row: CompareRow, key: (typeof dimensions)[number]['key']): string {
  const value = row[key]
  return Array.isArray(value) ? value.join('、') : String(value)
}

onMounted(async () => {
  // 类方对比需要跨篇推导相关条文标签，加载全量内容
  const data = await loadContent()
  content.value = data
  selectedIds.value = data.formulas.slice(0, 2).map((formula) => formula.id)
  buildRows()
})
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <AppHeader
      title="方证对比"
      show-back
      back-to="/formulas"
    />

    <div class="flex flex-wrap items-center gap-2">
      <TagPill
        v-for="row in rows"
        :key="row.formula.id"
        tone="cinnabar"
      >
        {{ row.formula.name }}
        <button
          type="button"
          class="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs leading-none"
          :aria-label="`移除${row.formula.name}`"
          @click="removeFormula(row.formula.id)"
        >
          ×
        </button>
      </TagPill>
      <button
        type="button"
        class="inline-flex min-h-8 items-center gap-1 rounded-full border border-dashed border-border-paper px-3 text-xs text-indigo hover:bg-paper-deep"
      >
        <Plus
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
        添加方剂
      </button>
    </div>

    <div
      class="mt-4 overflow-x-auto rounded-2xl border border-border-paper bg-paper-card shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <table class="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr class="border-b border-border-paper">
            <th
              class="sticky left-0 w-28 bg-paper-card px-3 py-3 text-sm font-semibold text-ink-muted"
            >
              维度
            </th>
            <th
              v-for="row in rows"
              :key="row.formula.id"
              class="px-3 py-3 font-serif text-[15px] text-ink"
            >
              {{ row.formula.name }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="dimension in dimensions"
            :key="dimension.key"
            class="border-b border-border-paper last:border-b-0"
          >
            <th
              class="sticky left-0 bg-paper-card px-3 py-3 align-top text-sm font-semibold text-ink-secondary"
            >
              {{ dimension.label }}
            </th>
            <td
              v-for="row in rows"
              :key="row.formula.id"
              class="px-3 py-3 align-top text-[13px] leading-relaxed text-ink-secondary"
            >
              <span
                class="inline-block rounded-md px-2 py-1"
                :class="dimension.key === 'relatedClauses' ? 'text-indigo' : 'bg-paper-deep'"
              >
                {{ cellValue(row, dimension.key) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-3 text-xs text-ink-muted">
      浅色底标记 = 差异项；相关条文为靛青链接占位。
    </p>
  </div>
</template>
