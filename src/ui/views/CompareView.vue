<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { ref } from 'vue'

import AppHeader from '../components/AppHeader.vue'
import TagPill from '../components/TagPill.vue'
import { compareFormulas, type CompareFormulaPreview } from '../mockData'

const selected = ref<CompareFormulaPreview[]>([...compareFormulas])

function removeFormula(id: string) {
  selected.value = selected.value.filter((item) => item.id !== id)
}

const dimensions = [
  { key: 'composition', label: '组成' },
  { key: 'mainSymptoms', label: '核心主症' },
  { key: 'pulse', label: '脉象' },
  { key: 'pathomechanism', label: '病机' },
  { key: 'relatedClauses', label: '相关条文' },
] as const

function cellValue(
  formula: CompareFormulaPreview,
  key: (typeof dimensions)[number]['key']
): string {
  const value = formula[key]
  return Array.isArray(value) ? value.join('、') : String(value)
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <AppHeader
      title="方证对比"
      show-back
      back-to="/"
    />

    <div class="flex flex-wrap items-center gap-2">
      <TagPill
        v-for="formula in selected"
        :key="formula.id"
        tone="cinnabar"
      >
        {{ formula.name }}
        <button
          type="button"
          class="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/30 text-xs leading-none"
          :aria-label="`移除${formula.name}`"
          @click="removeFormula(formula.id)"
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
              v-for="formula in selected"
              :key="formula.id"
              class="px-3 py-3 font-serif text-[15px] text-ink"
            >
              {{ formula.name }}
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
              v-for="formula in selected"
              :key="formula.id"
              class="px-3 py-3 align-top text-[13px] leading-relaxed text-ink-secondary"
            >
              <span
                class="inline-block rounded-md px-2 py-1"
                :class="dimension.key === 'relatedClauses' ? 'text-indigo' : 'bg-paper-deep'"
              >
                {{ cellValue(formula, dimension.key) }}
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
