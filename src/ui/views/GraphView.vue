<script setup lang="ts">
import { Download, RefreshCw, Search, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { loadContent } from '../../data'
import type { ContentData } from '../../data/types'
import {
  buildGraphDataset,
  locateGraphNode,
  neighborSubgraph,
} from '../../domain/graph/data'
import type { GraphDataset, GraphNodeData } from '../../domain/graph/data'
import AppHeader from '../components/AppHeader.vue'
import { ForceGraph } from '../graph/ForceGraph'
import type { SimNode } from '../graph/ForceGraph'

const route = useRoute()

const loading = ref(true)
const showTexts = ref(false)
const showSymptoms = ref(false)
const searchQuery = ref('')
const notFound = ref(false)
const neighborMode = ref(false)
const selectedNode = ref<GraphNodeData | null>(null)
/** 已应用到引擎的数据集规模，用于无障碍状态播报与回归测试。 */
const appliedCount = ref<{ nodes: number; links: number } | null>(null)

const canvasRef = ref<HTMLCanvasElement | null>(null)

let content: ContentData | null = null
let fullDataset: GraphDataset | null = null
let graph: ForceGraph | null = null
let notFoundTimer: ReturnType<typeof setTimeout> | undefined

/** 当前选中节点的 id（引擎 onSelect 同步维护）。 */
const focusId = computed(() => selectedNode.value?.id ?? null)

/* ---------------- 数据集构建 ---------------- */

function buildDatasets(): void {
  if (!content) return
  fullDataset = buildGraphDataset({
    formulas: content.formulas,
    herbs: content.herbs,
    clauses: content.clauses,
    symptomTerms: content.symptomTerms,
    includeTextNodes: showTexts.value,
    includeSymptomNodes: showSymptoms.value,
  })
}

function currentDataset(): GraphDataset {
  if (!fullDataset || !focusId.value || !neighborMode.value) return fullDataset ?? { nodes: [], links: [] }
  return neighborSubgraph(fullDataset, focusId.value)
}

/**
 * 将当前数据集交给引擎渲染；
 * 若有选中节点且仍存在于新数据集中，恢复其选中态（面板与邻居高亮不丢）。
 */
function applyDataset(): void {
  if (!graph) return
  // 焦点节点可能因数据集变化（如关闭条文开关）而消失，先校验
  if (selectedNode.value && fullDataset) {
    const exists = fullDataset.nodes.some((node) => node.id === selectedNode.value!.id)
    if (!exists) selectedNode.value = null
  }
  const dataset = currentDataset()
  graph.setData(dataset.nodes, dataset.links)
  appliedCount.value = { nodes: dataset.nodes.length, links: dataset.links.length }
  const id = focusId.value
  if (id && dataset.nodes.some((node) => node.id === id)) {
    graph.selectById(id)
  }
}

/* ---------------- 引擎选择回调 ---------------- */

function nodeOf(id: string | null): GraphNodeData | null {
  if (!fullDataset || !id) return null
  return fullDataset.nodes.find((node) => node.id === id) ?? null
}

function handleEngineSelect(node: SimNode | null): void {
  selectedNode.value = nodeOf(node?.id ?? null)
  if (!node && neighborMode.value) {
    // 清空选择时退出「只看邻居」，回到全图
    neighborMode.value = false
    applyDataset()
  }
}

/* ---------------- 工具栏动作 ---------------- */

async function submitSearch(): Promise<void> {
  if (!graph) return
  const q = searchQuery.value.trim()
  if (!q) {
    notFound.value = false
    return
  }

  // 纯数字按条文号定位；条文节点默认关闭时先临时开启再查找
  if (/^\d+$/.test(q) && !showTexts.value) {
    showTexts.value = true
    await nextTick()
  }

  let id = locateGraphNode(currentDataset(), q)
  if (!id && !showSymptoms.value) {
    // 症状节点默认关闭：在含症状层的探测数据集中试查，命中则自动开启症状层
    const probe = probeSymptomDataset(q)
    if (probe) {
      fullDataset = probe
      showSymptoms.value = true
      await nextTick()
      id = locateGraphNode(currentDataset(), q)
    }
  }
  if (!id) {
    flashNotFound()
    return
  }
  neighborMode.value = false
  graph.selectById(id, true)
}

/** 构建含症状层的数据集；仅当查询能在其中命中时返回，否则返回 null。 */
function probeSymptomDataset(query: string): GraphDataset | null {
  if (!content) return null
  const probe = buildGraphDataset({
    formulas: content.formulas,
    herbs: content.herbs,
    clauses: content.clauses,
    symptomTerms: content.symptomTerms,
    includeTextNodes: showTexts.value,
    includeSymptomNodes: true,
  })
  return locateGraphNode(probe, query) ? probe : null
}

function flashNotFound(): void {
  notFound.value = true
  clearTimeout(notFoundTimer)
  notFoundTimer = setTimeout(() => {
    notFound.value = false
  }, 2500)
}

function relayout(): void {
  if (!graph) return
  selectedNode.value = null
  neighborMode.value = false
  graph.relayout()
}

function exportPng(): void {
  const source = canvasRef.value
  if (!source) return
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#f5efe2' // --color-paper 纸色底
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(source, 0, 0)
  out.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '伤寒知识图谱.png'
    a.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function closePanel(): void {
  graph?.clearSelection()
  handleEngineSelect(null)
}

/* ---------------- 深链 ---------------- */

function applyFocusQuery(): void {
  const raw = route.query.focus
  const id = typeof raw === 'string' ? raw : null
  if (!id) return
  if ((route.query.texts === '1' || id.startsWith('t:')) && !showTexts.value) {
    showTexts.value = true
  }
  // 数据集就绪后由 applyDataset/select 恢复
  queueMicrotask(() => {
    if (graph && graph.nodeById.has(id)) {
      neighborMode.value = false
      graph.selectById(id, true)
    }
  })
}

/* ---------------- 生命周期 ---------------- */

watch([showTexts, showSymptoms], () => {
  buildDatasets()
  applyDataset()
})

/**
 * 「只看邻居」桥接：neighborMode / focusId 任一变化时重建数据集。
 * - 邻居模式开启 → 围绕当前选中构建子图；
 * - 邻居模式下点选其他节点（focusId 变）→ 子图跟随新焦点移动；
 * - 邻居模式关闭 → 回全图并恢复选中。
 * 焦点变化但不在邻居模式时不重建，避免普通点选触发布局重算抖动。
 */
let prevNeighborMode = false
watch([neighborMode, focusId], ([nm]) => {
  if (!graph || loading.value) return
  const toggled = nm !== prevNeighborMode
  prevNeighborMode = nm
  if (!toggled && !nm) return
  applyDataset()
})

onMounted(async () => {
  content = await loadContent()
  buildDatasets()

  if (canvasRef.value) {
    graph = new ForceGraph(canvasRef.value, { onSelect: handleEngineSelect })
    applyDataset()
  }

  loading.value = false
  applyFocusQuery()
})

// 页内再次触发深链（如连续从两个详情页进入）
watch(
  () => route.query.focus,
  async () => {
    if (!route.query.focus) return
    await nextTick()
    applyFocusQuery()
  }
)

onBeforeUnmount(() => {
  clearTimeout(notFoundTimer)
  graph?.dispose()
  graph = null
  fullDataset = null
  content = null
})

/* ---------------- 信息面板摘要 ---------------- */

function herbNameOf(id: string): string {
  return content?.herbs.find((herb) => herb.id === id)?.name ?? id
}

const summary = computed(() => {
  const node = selectedNode.value
  if (!content || !node) return null

  if (node.type === 'formula') {
    const formula = content.formulas.find((item) => item.id === node.refId)
    if (!formula) return null
    return {
      badge: '方剂',
      badgeClass: 'bg-cinnabar-soft text-cinnabar',
      title: formula.name,
      detailLink: `/formulas/${formula.id}`,
      quizLink: `/quiz?formula=${formula.id}`,
      lines: [
        { label: '分类', value: formula.category },
        {
          label: '组成',
          value: formula.composition
            .slice(0, 10)
            .map((c) => (c.dose ? `${herbNameOf(c.herb)}（${c.dose}）` : herbNameOf(c.herb)))
            .join('、'),
        },
        ...(formula.mainSymptoms.length
          ? [{ label: '主症', value: formula.mainSymptoms.slice(0, 6).join('、') }]
          : []),
      ],
    }
  }

  if (node.type === 'symptom') {
    const term = content.symptomTerms.find((item) => item.id === node.refId)
    if (!term) return null
    return {
      badge: '症状',
      badgeClass: 'bg-gold/15 text-gold',
      title: term.name,
      detailLink: null,
      quizLink: null,
      lines: [
        ...(term.aliases.length ? [{ label: '别名', value: term.aliases.join('、') }] : []),
        { label: '类别', value: term.category },
      ],
    }
  }

  if (node.type === 'herb') {
    const herb = content.herbs.find((item) => item.id === node.refId)
    if (!herb) return null
    const formulaCount = content.formulas.filter((f) =>
      f.composition.some((c) => c.herb === herb.id)
    ).length
    return {
      badge: '中药',
      badgeClass: 'bg-green-soft text-green',
      title: herb.name,
      detailLink: `/herbs/${herb.id}`,
      quizLink: null,
      lines: [
        ...(herb.aliases.length ? [{ label: '别名', value: herb.aliases.join('、') }] : []),
        { label: '出现方剂', value: `${formulaCount} 首` },
      ],
    }
  }

  const clause = content.clauses.find((item) => item.id === node.refId)
  if (!clause) return null
  return {
    badge: '条文',
    badgeClass: 'bg-indigo-soft text-indigo',
    title: `第${clause.no}条`,
    detailLink: `/clauses/${clause.id}`,
    quizLink: `/quiz?clause=${clause.id}`,
    lines: [{ label: '原文', value: clause.text.length > 56 ? `${clause.text.slice(0, 56)}…` : clause.text }],
  }
})

const NODE_COLORS: Record<string, string> = {
  formula: '#8b0000',
  herb: '#3e7c4f',
  text: '#35506b',
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader
      title="知识图谱"
      subtitle="方剂 · 中药 · 条文 关系网络"
      show-back
      back-to="/"
    >
      <template #actions>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-paper-deep"
          aria-label="导出图片"
          :disabled="loading"
          @click="exportPng"
        >
          <Download
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </template>
    </AppHeader>

    <!-- 工具栏 -->
    <div class="flex flex-wrap items-center gap-2">
      <label
        class="flex cursor-pointer items-center gap-1.5 rounded-full border border-border-paper bg-paper-card px-3 py-1.5 text-xs text-ink-secondary select-none"
      >
        <input
          v-model="showTexts"
          type="checkbox"
          class="accent-cinnabar"
          :disabled="loading"
        >
        显示条文节点
      </label>

      <label
        class="flex cursor-pointer items-center gap-1.5 rounded-full border border-border-paper bg-paper-card px-3 py-1.5 text-xs text-ink-secondary select-none"
      >
        <input
          v-model="showSymptoms"
          type="checkbox"
          class="accent-cinnabar"
          aria-label="显示症状节点"
          :disabled="loading"
        >
        显示症状节点
      </label>

      <div class="relative flex-1 basis-44">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          v-model="searchQuery"
          type="search"
          enterkeyhint="search"
          placeholder="方剂 / 中药 / 条文号"
          class="h-9 w-full rounded-full border border-border-paper bg-paper-card pl-8 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-cinnabar/50 focus:outline-none"
          aria-label="在图谱中搜索定位"
          @keydown.enter.prevent="submitSearch"
        >
      </div>

      <button
        type="button"
        class="flex items-center gap-1 rounded-full border border-border-paper bg-paper-card px-3 py-1.5 text-xs text-ink-secondary active:scale-95"
        aria-label="重新布局"
        @click="relayout"
      >
        <RefreshCw
          class="h-3.5 w-3.5"
          aria-hidden="true"
        />
        重排
      </button>
    </div>

    <p
      v-if="notFound"
      class="mt-1.5 text-xs text-cinnabar"
      role="status"
    >
      未找到匹配的方剂、中药或条文
    </p>

    <!-- 图区 -->
    <div class="relative mt-3 h-[64vh] min-h-96 overflow-hidden rounded-2xl border border-border-paper bg-paper-card shadow-[0_4px_12px_rgba(34,26,16,.05)]">
      <canvas
        ref="canvasRef"
        class="block h-full w-full"
        aria-label="伤寒论方剂中药条文关系力导向图"
      />

      <!-- 图例 -->
      <div class="pointer-events-none absolute left-3 top-3 flex gap-3 rounded-full bg-paper/80 px-3 py-1.5 text-[11px] text-ink-secondary backdrop-blur">
        <span
          v-for="(color, type) in NODE_COLORS"
          :key="type"
          class="flex items-center gap-1"
        >
          <span
            class="inline-block h-2 w-2 rounded-full"
            :style="{ backgroundColor: color }"
            aria-hidden="true"
          />
          {{ type === 'formula' ? '方剂' : type === 'herb' ? '中药' : type === 'text' ? '条文' : '症状' }}
        </span>
      </div>

      <!-- 信息面板 -->
      <div
        v-if="summary"
        class="absolute left-3 top-12 w-[min(20rem,88%)] rounded-xl border border-border-paper bg-paper-card/95 p-4 shadow-[0_8px_24px_rgba(34,26,16,.14)] backdrop-blur"
      >
        <div class="flex items-start justify-between gap-2">
          <span
            class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            :class="summary.badgeClass"
          >{{ summary.badge }}</span>
          <button
            type="button"
            class="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-full text-ink-muted hover:bg-paper-deep"
            aria-label="关闭信息面板"
            @click="closePanel"
          >
            <X
              class="h-4 w-4"
              aria-hidden="true"
            />
          </button>
        </div>
        <h2 class="mt-1.5 font-serif text-lg font-bold text-ink">
          {{ summary.title }}
        </h2>
        <dl class="mt-2 space-y-1.5 text-xs leading-relaxed">
          <div
            v-for="line in summary.lines"
            :key="line.label"
          >
            <dt class="inline text-ink-muted">
              {{ line.label }}：
            </dt>
            <dd class="inline text-ink">
              {{ line.value }}
            </dd>
          </div>
        </dl>
        <div class="mt-3 flex items-center gap-2">
          <RouterLink
            v-if="summary.detailLink"
            :to="summary.detailLink"
            class="text-xs font-medium text-cinnabar underline decoration-cinnabar/40 underline-offset-2"
          >
            查看详情 →
          </RouterLink>
          <RouterLink
            v-if="summary.quizLink"
            :to="summary.quizLink"
            class="text-xs font-medium text-green underline decoration-green/40 underline-offset-2"
          >
            刷相关题 →
          </RouterLink>
          <button
            type="button"
            class="ml-auto rounded-full border border-gold/50 px-2.5 py-1 text-[11px] font-medium text-gold transition-colors hover:bg-gold/10"
            @click="neighborMode = !neighborMode"
          >
            {{ neighborMode ? '↩ 返回全图' : '⊙ 只看邻居' }}
          </button>
        </div>
      </div>

      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center bg-paper-card/70 text-sm text-ink-muted"
      >
        正在生成图谱…
      </div>
    </div>

    <p class="mt-3 text-xs leading-relaxed text-ink-muted">
      拖拽节点可调整位置，滚轮 / 双指缩放，双击复位视野。实线为「组成」「出处」「主症」关系，虚线为「见症」「提示症」症状关系，金色连线表示同现于多个方剂的药对。
    </p>

    <p
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      图谱：{{ appliedCount?.nodes ?? 0 }} 节点 / {{ appliedCount?.links ?? 0 }} 关系{{
        neighborMode ? '（只看邻居）' : ''
      }}
    </p>
  </div>
</template>
