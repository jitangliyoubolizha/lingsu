<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import type { Clause, SymptomTerm } from '../../data/types'
import { loadMeta } from '../../data'
import { getNote, saveNote } from '../../store'
import { formatChapterCode } from '../formatters'
import { clauseNavDirection } from '../composables/useSwipeNavigate'
import AccordionPanel from './AccordionPanel.vue'
import ClauseLinkText from './ClauseLinkText.vue'
import TagPill from './TagPill.vue'

/**
 * 条文详情页正文（E-15 整页翻页）：顶栏以下的全部内容区块。
 * 当前页与翻页轨道中的相邻页共用同一组件，保证拖动中看到的下一页与换页后的真实页面一致。
 * 相邻页副本以 interactive=false 渲染：不加载我的笔记、印章不做盖印动画。
 */
const props = withDefaults(
  defineProps<{
    clause: Clause
    clauseOrder: string[]
    symptomTerms: SymptomTerm[]
    /** 当前页：笔记可编辑、印章播盖印动画；相邻页副本关闭 */
    interactive?: boolean
    /** 入场编舞（区块错峰浮入），仅从列表/外链进入的当前页播放 */
    withChoreo?: boolean
  }>(),
  { interactive: false, withChoreo: false }
)

const chapterName = computed(() => {
  const id = props.clause.id.split('.')
  return id.length >= 3 ? formatChapterCode(id[2]) : '条文详情'
})

const prevId = computed(() => {
  const index = props.clauseOrder.indexOf(props.clause.id)
  return index > 0 ? props.clauseOrder[index - 1] : undefined
})

const nextId = computed(() => {
  const order = props.clauseOrder
  const index = order.indexOf(props.clause.id)
  return index >= 0 && index < order.length - 1 ? order[index + 1] : undefined
})

function termName(id: string): string {
  return props.symptomTerms.find((term) => term.id === id)?.name ?? id
}

function formulaName(id: string): string {
  return loadMeta().formulas.find((formula) => formula.id === id)?.name ?? id
}

/**
 * 注解条目标题：公版引文署注家名（source 为注本书名）；
 * 现代观点为化用转述（source 命名约定「参考《书名》」），署「观点化用」以示非逐字引文。
 */
function annotationTitle(annotation: Clause['annotations'][number]): string {
  const suffix = annotation.source.startsWith('参考《')
    ? '观点化用'
    : annotation.author
  return `名家注解 · ${suffix}`
}

/* —— 我的笔记（E-5，仅存本机、随备份导出）；相邻页副本不加载 —— */
const noteContent = ref('')
const noteSaved = ref(false)
let noteStatusTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.clause.id,
  async (id) => {
    if (!props.interactive) return
    noteSaved.value = false
    const note = await getNote(id)
    noteContent.value = note?.content ?? ''
  },
  { immediate: true }
)

/** 保存笔记；清空内容即删除。 */
async function persistNote() {
  await saveNote(props.clause.id, noteContent.value)
  noteSaved.value = true
  clearTimeout(noteStatusTimer)
  noteStatusTimer = setTimeout(() => {
    noteSaved.value = false
  }, 2000)
}

onBeforeUnmount(() => clearTimeout(noteStatusTimer))
</script>

<template>
  <div>
    <div :class="withChoreo ? 'choreo flex flex-wrap gap-2' : 'flex flex-wrap gap-2'">
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
      :class="
        withChoreo
          ? 'clause-frame choreo choreo-2 mt-4 rounded-2xl bg-paper-card p-5'
          : 'clause-frame mt-4 rounded-2xl bg-paper-card p-5'
      "
    >
      <p class="text-justify font-serif text-[27px] leading-[1.9] tracking-[0.04em] text-ink">
        <span
          class="float-right mb-2 ml-3 flex h-10 w-10 flex-col items-center justify-center rounded-[6px] bg-cinnabar font-serif text-[10px] leading-[1.2] text-white shadow-[0_2px_6px_rgba(34,26,16,.25)]"
          :class="{ 'seal-stamp': withChoreo }"
          aria-hidden="true"
        >
          <span>第</span>
          <span>{{ clause.no }}</span>
          <span>条</span>
        </span>
        <ClauseLinkText
          :text="clause.text"
          :clause-order="clauseOrder"
        />
      </p>
    </section>

    <section :class="withChoreo ? 'choreo choreo-3 mt-4' : 'mt-4'">
      <h2 class="section-title mb-2">
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

    <div :class="withChoreo ? 'choreo choreo-4 mt-4 space-y-3' : 'mt-4 space-y-3'">
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
        :title="annotationTitle(annotation)"
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
      :class="
        withChoreo
          ? 'choreo choreo-5 mt-4 rounded-2xl border border-border-paper bg-paper-card p-4'
          : 'mt-4 rounded-2xl border border-border-paper bg-paper-card p-4'
      "
    >
      <h2 class="section-title">
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
    <section
      v-if="interactive"
      :class="
        withChoreo
          ? 'choreo choreo-6 mt-4 rounded-2xl border border-border-paper bg-paper-card p-4'
          : 'mt-4 rounded-2xl border border-border-paper bg-paper-card p-4'
      "
    >
      <h2 class="section-title">
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
        v-if="prevId"
        :to="`/clauses/${prevId}`"
        replace
        class="text-sm text-indigo"
        @click="clauseNavDirection = 'prev'"
      >
        上一条
      </RouterLink>
      <span v-else />
      <RouterLink
        v-if="nextId"
        :to="`/clauses/${nextId}`"
        replace
        class="text-sm text-indigo"
        @click="clauseNavDirection = 'next'"
      >
        下一条
      </RouterLink>
    </div>
  </div>
</template>
