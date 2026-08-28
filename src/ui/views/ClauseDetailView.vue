<script setup lang="ts">
import { PenLine, Star } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import type { Clause, ContentData } from '../../data/types'
import { chapterCodeOfClause, loadChapter, loadMeta } from '../../data'
import { addFavorite, getNote, isFavorite, removeFavorite, saveNote } from '../../store'
import AccordionPanel from '../components/AccordionPanel.vue'
import AppHeader from '../components/AppHeader.vue'
import ClauseLinkText from '../components/ClauseLinkText.vue'
import EmptyState from '../components/EmptyState.vue'
import TagPill from '../components/TagPill.vue'
import { formatChapterCode } from '../formatters'

const route = useRoute()
const content = ref<ContentData>()
const clause = ref<Clause>()
const favorite = ref(false)
const loaded = ref(false)

const clauseId = computed(() => String(route.params.id))
/** 全书条文顺序（宋本第 N 条 → clauseId），供条文互链渲染 */
const clauseOrder = loadMeta().clauseOrder

/* —— 我的笔记（E-5，仅存本机、随备份导出） —— */
const noteContent = ref('')
const noteSaved = ref(false)
let noteStatusTimer: ReturnType<typeof setTimeout> | undefined
const feedbackTo = computed(() =>
  clause.value
    ? {
        path: '/feedback',
        query: {
          type: 'clause',
          location: `太阳·第 ${clause.value.no} 条`,
          from: route.fullPath,
        },
      }
    : { path: '/feedback' }
)
// 上一条/下一条只依赖全书顺序（元数据），无需加载其它篇章
const clauseIndex = computed(() => loadMeta().clauseOrder.indexOf(clauseId.value))
const prevClause = computed(() => {
  const index = clauseIndex.value
  return index > 0 ? { id: loadMeta().clauseOrder[index - 1] } : undefined
})
const nextClause = computed(() => {
  const order = loadMeta().clauseOrder
  const index = clauseIndex.value
  return index >= 0 && index < order.length - 1 ? { id: order[index + 1] } : undefined
})
const chapterName = computed(() => {
  const id = clauseId.value.split('.')
  return id.length >= 3 ? formatChapterCode(id[2]) : '条文详情'
})

function termName(id: string): string {
  return content.value?.symptomTerms.find((term) => term.id === id)?.name ?? id
}

function formulaName(id: string): string {
  return loadMeta().formulas.find((formula) => formula.id === id)?.name ?? id
}

/** 只加载条文所属篇章；方剂、术语等数据来自随主包加载的元数据。 */
async function load() {
  loaded.value = false
  const meta = loadMeta()
  const chapterCode = chapterCodeOfClause(clauseId.value)
  const chapter = chapterCode ? await loadChapter(chapterCode) : undefined

  clause.value = chapter?.clauses.find((item) => item.id === clauseId.value)
  content.value = {
    ...meta,
    // 条文详情仅需方剂名，从 loadMeta().formulas 摘要取，不加载完整方剂数据
    formulas: [],
    chapters: chapter ? [chapter] : [],
    clauses: chapter?.clauses ?? [],
  }

  if (clause.value) {
    favorite.value = await isFavorite('clause', clause.value.id)
    clearTimeout(noteStatusTimer)
    noteSaved.value = false
    const note = await getNote(clause.value.id)
    noteContent.value = note?.content ?? ''
  }
  loaded.value = true
}

/** 保存笔记；清空内容即删除。 */
async function persistNote() {
  if (!clause.value) return
  await saveNote(clause.value.id, noteContent.value)
  noteSaved.value = true
  clearTimeout(noteStatusTimer)
  noteStatusTimer = setTimeout(() => {
    noteSaved.value = false
  }, 2000)
}

async function toggleFavorite() {
  if (!clause.value) return
  if (favorite.value) {
    await removeFavorite('clause', clause.value.id)
    favorite.value = false
  } else {
    await addFavorite('clause', clause.value.id)
    favorite.value = true
  }
}

onMounted(load)
// 路由不带 key，上一条/下一条复用同一组件实例，需在条文变化时重新加载
watch(clauseId, load)
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      :title="clause ? `太阳·第 ${clause.no} 条` : '条文详情'"
      show-back
      back-to="/clauses"
    >
      <template #actions>
        <RouterLink
          v-if="clause"
          :to="feedbackTo"
          class="flex h-9 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-ink-secondary hover:bg-paper-deep hover:text-ink"
          aria-label="纠错"
        >
          <PenLine
            class="h-4 w-4"
            aria-hidden="true"
          />
          纠错
        </RouterLink>
        <button
          v-if="clause"
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          :aria-label="favorite ? '取消收藏' : '收藏本条'"
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
      v-if="loaded && !clause"
      title="未找到该条文"
      description="请返回列表重新选择"
    />

    <template v-else-if="clause && content">
      <div class="flex flex-wrap gap-2">
        <TagPill tone="muted">
          {{ chapterName }}
        </TagPill>
        <TagPill tone="muted">
          汉 · 张仲景
        </TagPill>
        <RouterLink
          :to="{ path: '/graph', query: { focus: `t:${clause.id}`, texts: '1' } }"
          class="rounded-full border border-gold/50 bg-gold/10 px-3 py-1 text-xs font-medium text-gold transition-colors hover:bg-gold/20"
          aria-label="在知识图谱中查看该条文"
        >
          ⊙ 在图谱中查看
        </RouterLink>
      </div>

      <section
        class="zhusi-rule mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_8px_24px_rgba(34,26,16,.08)]"
      >
        <div
          class="mb-4 h-1 w-10 rounded-full bg-cinnabar"
          aria-hidden="true"
        />
        <p class="font-serif text-[27px] leading-[1.8] text-ink">
          <ClauseLinkText
            :text="clause.text"
            :clause-order="clauseOrder"
          />
        </p>
      </section>

      <section class="mt-4">
        <h2 class="mb-2 text-sm font-semibold text-ink-secondary">
          主症标签
        </h2>
        <div class="flex flex-wrap gap-2">
          <TagPill
            v-for="tag in clause.symptomTags"
            :key="tag"
            tone="default"
          >
            {{ termName(tag) }}
          </TagPill>
        </div>
      </section>

      <div class="mt-4 space-y-3">
        <AccordionPanel
          title="白话译文"
          :default-open="true"
        >
          <p class="text-sm leading-relaxed text-ink-secondary">
            <ClauseLinkText
              :text="clause.translation"
              :clause-order="clauseOrder"
            />
          </p>
        </AccordionPanel>

        <AccordionPanel
          v-for="annotation in clause.annotations"
          :key="annotation.source"
          :title="`名家注解 · ${annotation.author}`"
          :source="annotation.source"
        >
          <p class="text-sm leading-relaxed text-ink-secondary">
            <ClauseLinkText
              :text="annotation.text"
              :clause-order="clauseOrder"
            />
          </p>
        </AccordionPanel>
      </div>

      <div
        v-if="clause.formulas.length"
        class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4"
      >
        <h2 class="text-sm font-semibold text-ink-secondary">
          相关方剂
        </h2>
        <div class="mt-2 space-y-1">
          <RouterLink
            v-for="formulaId in clause.formulas"
            :key="formulaId"
            :to="`/formulas/${formulaId}`"
            class="flex min-h-10 items-center justify-between rounded-lg px-2 text-sm text-indigo hover:bg-paper-deep"
          >
            {{ formulaName(formulaId) }}
          </RouterLink>
        </div>
      </div>

      <!-- 我的笔记：仅存本机 IndexedDB，随备份导出/导入 -->
      <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
        <h2 class="text-sm font-semibold text-ink-secondary">
          我的笔记
        </h2>
        <textarea
          v-model="noteContent"
          rows="3"
          aria-label="我的笔记"
          placeholder="写下你的理解、疑问或记忆要点（仅保存在本机）"
          class="mt-2 w-full resize-y rounded-lg border border-border-paper bg-paper p-2 text-sm leading-relaxed text-ink placeholder:text-ink-muted focus:border-cinnabar/50 focus:outline-none"
        />
        <div
          class="mt-2 flex items-center gap-2"
          role="status"
        >
          <button
            type="button"
            class="rounded-full bg-cinnabar px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cinnabar-deep"
            @click="persistNote"
          >
            保存笔记
          </button>
          <span
            v-if="noteSaved"
            class="text-xs text-green"
          >已保存</span>
          <span
            v-else
            class="text-xs text-ink-muted"
          >清空内容保存即删除笔记</span>
        </div>
      </section>

      <div class="mt-6 flex justify-between border-t border-border-paper pt-3">
        <RouterLink
          v-if="prevClause"
          :to="`/clauses/${prevClause.id}`"
          class="text-sm text-indigo"
        >
          上一条
        </RouterLink>
        <span v-else />
        <RouterLink
          v-if="nextClause"
          :to="`/clauses/${nextClause.id}`"
          class="text-sm text-indigo"
        >
          下一条
        </RouterLink>
      </div>
    </template>
  </div>
</template>
