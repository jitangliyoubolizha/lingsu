<script lang="ts">
import type { Clause } from '../../data/types'

/**
 * 条文/收藏缓存（模块级，非实例级）：App.vue 按 :key="route.fullPath" 渲染，
 * 整页翻页每条都换实例重挂载——实例级缓存随卸载清空，新页首帧必空白（闪烁源）；
 * 模块级缓存让新页首帧即有内容、星标状态首帧即正确。
 */
const clauseCache = new Map<string, Clause>()
const favoriteCache = new Map<string, boolean>()
</script>

<script setup lang="ts">
import { PenLine, Star } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { chapterCodeOfClause, loadChapter, loadMeta } from '../../data'
import { addFavorite, isFavorite, removeFavorite } from '../../store'
import AppHeader from '../components/AppHeader.vue'
import ClausePageContent from '../components/ClausePageContent.vue'
import EmptyState from '../components/EmptyState.vue'
import {
  clauseEntryFrom,
  clauseNavDirection,
  pagerSettling,
  useSwipeNavigate,
} from '../composables/useSwipeNavigate'

const route = useRoute()
const router = useRouter()
const clause = ref<Clause>()
const favorite = ref(false)
const loaded = ref(false)

const clauseId = computed(() => String(route.params.id))
/** 全书条文顺序（宋本第 N 条 → clauseId），供条文互链与相邻页定位 */
const clauseOrder = loadMeta().clauseOrder
const symptomTerms = loadMeta().symptomTerms

// 相邻条文只依赖全书顺序（元数据），无需加载其它篇章
const clauseIndex = computed(() => clauseOrder.indexOf(clauseId.value))
const prevClause = computed(() => {
  const index = clauseIndex.value
  return index > 0 ? { id: clauseOrder[index - 1] } : undefined
})
const nextClause = computed(() => {
  const index = clauseIndex.value
  return index >= 0 && index < clauseOrder.length - 1 ? { id: clauseOrder[index + 1] } : undefined
})

async function toggleFavorite() {
  if (!clause.value) return
  if (favorite.value) {
    await removeFavorite('clause', clause.value.id)
    favorite.value = false
  } else {
    await addFavorite('clause', clause.value.id)
    favorite.value = true
  }
  favoriteCache.set(clause.value.id, favorite.value)
}

/** 顶栏返回：回进入条文时的来源页（列表/搜索），一步到位。
 *  来源页不是条文时走 history.back（浏览器还原其滚动位置）；
 *  历史栈被旧版逐条 push 翻条污染（上一步还是条文）时，直接回条文库。 */
function goBackToEntry() {
  const backPath = router.options.history.state?.back
  clauseNavDirection.value = 'prev'
  if (typeof backPath === 'string' && !backPath.startsWith('/clauses/')) {
    router.back()
  } else {
    void router.push(clauseEntryFrom.value ?? '/clauses')
  }
}

/* —— 整页横滑翻条（E-15）：轨道 [上一页｜当前页｜下一页]，拖动整页跟手 —— */

function clauseTitle(no: number | undefined): string {
  return no === undefined ? '条文详情' : `太阳·第 ${no} 条`
}

/** 相邻页副本数据：与当前页共用同一内容组件，拖动中看到的即换页后的真实版式 */
const pagerNeighbors = ref<{ prev?: Clause; next?: Clause }>({})

watch(
  clauseId,
  (id) => {
    // 不先清空旧副本：换页瞬间同步卸载两整页 DOM 是交接落点顿挫的来源。
    // 篇章加载走内存缓存（一个微任务），期间旧副本短暂驻留屏外槽位，几何不变
    for (const dir of ['prev', 'next'] as const) {
      const target = dir === 'next' ? nextClause.value : prevClause.value
      const targetId = target?.id
      if (!targetId) continue
      const code = chapterCodeOfClause(targetId)
      if (!code) continue
      void loadChapter(code).then((chapter) => {
        // 快速连续翻条时丢弃过期篇章的异步结果
        if (clauseId.value !== id) return
        const neighbor = chapter?.clauses.find((item) => item.id === targetId)
        if (neighbor) clauseCache.set(neighbor.id, neighbor)
        pagerNeighbors.value[dir] = neighbor
      })
    }
  },
  { immediate: true }
)

/** 键盘 ←/→ 与底部链接：方向性滑入转场；replace 原地换页——连续翻条不堆历史，返回直达来源页 */
function goTo(dir: 'next' | 'prev') {
  const target = dir === 'next' ? nextClause.value : prevClause.value
  if (!target) return
  clauseNavDirection.value = dir
  void router.replace(`/clauses/${target.id}`)
}

/** 整页滑动交接完成后换页：转场瞬时（page-instant），落点保持当前阅读位置；replace 同上 */
function goToPager(dir: 'next' | 'prev') {
  const target = dir === 'next' ? nextClause.value : prevClause.value
  if (!target) return
  clauseNavDirection.value = 'pager'
  void router
    .replace(`/clauses/${target.id}`)
    .finally(() => {
      pagerSettling.value = false
    })
}

const trackRef = ref<HTMLElement | null>(null)
const { swipeBindings } = useSwipeNavigate(trackRef, {
  canPrev: () => Boolean(prevClause.value),
  canNext: () => Boolean(nextClause.value),
  onNavigate: goToPager,
})

/** 条文间翻页整页就位，跳过区块编舞；仅从列表/外链进入时播放（挂载时判定一次） */
const withChoreo = clauseNavDirection.value === null

/** 焦点在笔记等输入控件内时方向键保持原生行为 */
function onKeydown(event: KeyboardEvent) {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
  const active = document.activeElement
  if (
    active instanceof HTMLElement &&
    (active.tagName === 'TEXTAREA' ||
      active.tagName === 'INPUT' ||
      active.tagName === 'SELECT' ||
      active.isContentEditable)
  ) {
    return
  }
  if (event.key === 'ArrowRight') goTo('next')
  else if (event.key === 'ArrowLeft') goTo('prev')
}

/** 只加载条文所属篇章；方剂、术语等数据来自随主包加载的元数据。 */
async function load() {
  loaded.value = false
  clause.value = clauseCache.get(clauseId.value)
  const chapterCode = chapterCodeOfClause(clauseId.value)
  const chapter = chapterCode ? await loadChapter(chapterCode) : undefined
  clause.value = chapter?.clauses.find((item) => item.id === clauseId.value)
  if (clause.value) {
    clauseCache.set(clause.value.id, clause.value)
    favorite.value = favoriteCache.get(clause.value.id) ?? false
    favorite.value = await isFavorite('clause', clause.value.id)
    favoriteCache.set(clause.value.id, favorite.value)
  }
  loaded.value = true
}

onMounted(load)
// App.vue 按 :key="route.fullPath" 渲染，翻条必换实例重挂载（onMounted 覆盖）；
// watch 仅作兜底：若未来去掉路由 key 复用实例，条文变化时仍能重新加载
watch(clauseId, load)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="mx-auto max-w-2xl overflow-x-clip pb-16">
    <!-- overflow-x-clip 收在内容柱上：相邻页任何断点下都不越过内容柱（桌面宽屏不外露）；
         clip 不创建滚动容器，顶栏吸顶不受影响 -->
    <!-- 翻页轨道：[上一页｜当前页｜下一页]，页间 24px 间距——静止时相邻页整体位于屏幕外，
         不会侵入两侧边距带；初始位移 -100%-24px 使当前页居中 -->
    <div
      ref="trackRef"
      class="flex w-full touch-pan-y gap-6"
      style="transform: translate3d(calc(-100% - 24px), 0, 0)"
      v-bind="swipeBindings"
    >
      <!-- 上一页副本：纯预览，不可交互、不参与无障碍树；无数据时保留空槽，轨道几何恒定 -->
      <div
        data-test="pager-prev"
        class="w-full shrink-0 select-none [&>header]:static"
        inert
        aria-hidden="true"
      >
        <template v-if="pagerNeighbors.prev">
          <AppHeader
            :title="clauseTitle(pagerNeighbors.prev.no)"
            show-back
            back-to="/clauses"
          />
          <ClausePageContent
            :clause="pagerNeighbors.prev"
            :clause-order="clauseOrder"
            :symptom-terms="symptomTerms"
          />
        </template>
      </div>

      <!-- 当前页 -->
      <div
        data-test="page-current"
        class="w-full shrink-0"
      >
        <AppHeader
          :title="clause ? clauseTitle(clause.no) : '条文详情'"
          show-back
          emit-back
          @back="goBackToEntry"
        >
          <template #actions>
            <RouterLink
              v-if="clause"
              :to="{
                path: '/feedback',
                query: { type: 'clause', location: `太阳·第 ${clause.no} 条`, from: route.fullPath },
              }"
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

        <ClausePageContent
          v-else-if="clause"
          :clause="clause"
          :clause-order="clauseOrder"
          :symptom-terms="symptomTerms"
          interactive
          :with-choreo="withChoreo"
        />
      </div>

      <!-- 下一页副本 -->
      <div
        data-test="pager-next"
        class="w-full shrink-0 select-none [&>header]:static"
        inert
        aria-hidden="true"
      >
        <template v-if="pagerNeighbors.next">
          <AppHeader
            :title="clauseTitle(pagerNeighbors.next.no)"
            show-back
            back-to="/clauses"
          />
          <ClausePageContent
            :clause="pagerNeighbors.next"
            :clause-order="clauseOrder"
            :symptom-terms="symptomTerms"
          />
        </template>
      </div>
    </div>
  </div>
</template>
