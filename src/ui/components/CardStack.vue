<!--
  React Bits「Stack」组件的 Vue 3 移植版（原版 MIT，reactbits.dev）。
  与原版差异：交互限定在顶牌（下层牌几乎被完全覆盖）；随机角每张牌只生成一次；
  扇形角度/缩放步进可配（宽卡场景调小步进以防卡片溢出容器）；
  释放回弹用 motion 的框架无关 vanilla API（带松手速度的弹簧），层叠姿态变化走 CSS 过渡；
  **送底判据按卡宽比例 + 轻甩速度**（原版固定 200px 像素阈值，宽卡上等于要拖半张卡才换牌，
  且缺速度判据时随手一拨毫无反应），3D 倾斜随送底进度线性映射。
-->
<script setup lang="ts" generic="T">
import { animate } from 'motion'
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'

interface SpringConfig {
  stiffness: number
  damping: number
}

const props = withDefaults(
  defineProps<{
    /** 卡片数据；渲染顺序即层叠顺序，数组末位为顶牌（最上层） */
    items: T[]
    /** 每张牌附加随机倾斜，营造随手堆放感（挂载时生成一次，保持稳定） */
    randomRotation?: boolean
    /** 随机倾斜幅度（度，±），randomRotation 开启时生效；原版为 ±5。宽卡场景调小可控制扇形外溢 */
    randomAmplitude?: number
    /** 送底距离阈值 = 卡宽 × 该比例（固定像素阈值在 672px 宽卡上等于要拖半张卡） */
    commitRatio?: number
    /** 送底阈值下限（px）：极窄卡片也不至于轻碰就换牌 */
    minCommitPx?: number
    /** 送底阈值上限（px）：超宽卡片不必拖过半屏 */
    maxCommitPx?: number
    /** px/ms，轻甩判据：位移不够但速度够也送底（随手一拨即换） */
    flickVelocity?: number
    /** 点击顶牌直接送底轮换 */
    sendToBackOnClick?: boolean
    /** 松手回弹的弹簧参数 */
    animationConfig?: SpringConfig
    /** 自动轮换；prefers-reduced-motion 下不启用 */
    autoplay?: boolean
    autoplayDelay?: number
    /** 悬停时暂停自动轮换 */
    pauseOnHover?: boolean
    /** 窄屏（≤ mobileBreakpoint）禁用拖拽、仅点击轮换，避免触摸拖卡与页面滚动冲突 */
    mobileClickOnly?: boolean
    mobileBreakpoint?: number
    /** 相邻牌的扇形角度步进（原版 4°，为 208px 方卡调校） */
    rotationStep?: number
    /** 相邻牌的缩放步进（原版 0.06） */
    scaleStep?: number
    /** 扇形展开的变换原点 */
    transformOrigin?: string
    ariaLabel?: string
  }>(),
  {
    randomRotation: false,
    randomAmplitude: 5,
    commitRatio: 0.18,
    minCommitPx: 48,
    maxCommitPx: 200,
    flickVelocity: 0.35,
    sendToBackOnClick: false,
    animationConfig: () => ({ stiffness: 260, damping: 20 }),
    autoplay: false,
    autoplayDelay: 3000,
    pauseOnHover: false,
    mobileClickOnly: false,
    mobileBreakpoint: 768,
    rotationStep: 4,
    scaleStep: 0.06,
    transformOrigin: '90% 90%',
    ariaLabel: '卡片轮换',
  }
)

/** 意图判定：位移超过该像素才算拖动（低于此值视为点按，不吞 click） */
const MOVE_INTENT_PX = 4
/** 轻甩的最小位移（px）：原地抖动不算甩动，防止点击时手抖误换牌 */
const FLICK_MIN_PX = 24
/** 拖到送底阈值处的 3D 倾斜上限（度）：倾斜随进度线性映射，全程有反馈 */
const TILT_MAX_DEG = 60

defineSlots<{
  card?(props: { item: T; index: number }): unknown
}>()

/** 层叠顺序：下标 0 为最底层，末位为顶牌；值为 items 下标 */
const order = ref<number[]>([])
/** 每张牌固定的随机倾斜角，按 items 下标存取 */
const rotations = ref<number[]>([])

watch(
  () => props.items,
  (items) => {
    order.value = items.map((_, i) => i)
    rotations.value = items.map(() =>
      props.randomRotation ? Math.random() * props.randomAmplitude * 2 - props.randomAmplitude : 0
    )
  },
  { immediate: true }
)

// 环境状态在 setup 即初始化（SPA 无 SSR，window 可用）：
// 保证首次渲染就按 reduced-motion / 视口宽度决定交互与自动轮换行为
const reduceMq = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null
const reducedMotion = ref(reduceMq?.matches ?? false)
const isMobile = ref(window.innerWidth < props.mobileBreakpoint)
const pageHidden = ref(document.hidden)
const hovering = ref(false)
const dragging = ref(false)

const dragDisabled = computed(() => props.mobileClickOnly && isMobile.value)
const clickToCycle = computed(
  () => props.sendToBackOnClick || (props.mobileClickOnly && isMobile.value)
)

function sendToBack(itemIndex: number) {
  if (order.value.length < 2) return
  const from = order.value.indexOf(itemIndex)
  if (from === -1) return
  order.value = [itemIndex, ...order.value.slice(0, from), ...order.value.slice(from + 1)]
}

function setHover(value: boolean) {
  if (props.pauseOnHover) hovering.value = value
}

// ---------- 自动轮换：悬停 / 切后台 / 拖拽中暂停 ----------

watchEffect((onCleanup) => {
  if (
    !props.autoplay ||
    reducedMotion.value ||
    hovering.value ||
    pageHidden.value ||
    dragging.value ||
    order.value.length < 2
  ) {
    return
  }
  const timer = window.setInterval(() => {
    sendToBack(order.value[order.value.length - 1])
  }, props.autoplayDelay)
  onCleanup(() => window.clearInterval(timer))
})

// ---------- 拖拽：顶牌跟随指针，松手弹簧归位 ----------

interface DragState {
  el: HTMLElement
  itemIndex: number
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  /** px/ms，一阶低通平滑，用于给回弹弹簧带入初速度 */
  vx: number
  vy: number
  moved: boolean
  /** 按下时缓存的卡宽：送底阈值据此计算，拖动中不读布局 */
  width: number
}

let drag: DragState | null = null
let releaseAnimation: ReturnType<typeof animate> | null = null
let suppressClick = false

/** 送底阈值：卡宽比例驱动，夹在 [minCommitPx, maxCommitPx] 之间 */
function commitSpan(width: number): number {
  return Math.min(props.maxCommitPx, Math.max(props.minCommitPx, width * props.commitRatio))
}

/**
 * 位移 → 3D 倾斜：原版为固定 ±100px → ∓60°，宽卡上拖过 100px 后倾斜就饱和了，
 * 剩下的路程毫无反馈；改为按送底阈值归一化——拖到阈值处正好 60°，
 * 倾斜进度即换牌进度（窄卡上倾斜也更跟手）。
 */
function tiltOf(offset: number, span: number): number {
  return Math.max(-1, Math.min(1, offset / span)) * TILT_MAX_DEG
}

function onPointerDown(event: PointerEvent, depth: number, itemIndex: number) {
  if (depth !== order.value.length - 1 || dragDisabled.value || dragging.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // 抓到进行中的回弹动画时直接吸附回原位，避免拖拽起点跳变
  releaseAnimation?.stop()
  releaseAnimation = null
  const el = event.currentTarget as HTMLElement
  el.style.transform = ''
  drag = {
    el,
    itemIndex,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    lastT: performance.now(),
    vx: 0,
    vy: 0,
    moved: false,
    width: el.clientWidth,
  }
  dragging.value = true
  // 拖动期间提升图层：逐帧 3D 倾斜会让浏览器重新光栅化，提升后走合成器
  el.style.willChange = 'transform'
  el.setPointerCapture(event.pointerId)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.moved && Math.hypot(dx, dy) > MOVE_INTENT_PX) drag.moved = true
  const now = performance.now()
  const dt = now - drag.lastT
  if (dt > 0) {
    drag.vx = 0.8 * drag.vx + 0.2 * ((event.clientX - drag.lastX) / dt)
    drag.vy = 0.8 * drag.vy + 0.2 * ((event.clientY - drag.lastY) / dt)
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastT = now
  }
  const span = commitSpan(drag.width)
  drag.el.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotateX(${-tiltOf(dy, span)}deg) rotateY(${tiltOf(dx, span)}deg)`
}

function onPointerUp(event: PointerEvent) {
  finishDrag(event)
}

function onPointerCancel(event: PointerEvent) {
  finishDrag(event)
}

function finishDrag(event: PointerEvent) {
  const state = drag
  if (!state) return
  drag = null
  dragging.value = false
  state.el.removeEventListener('pointermove', onPointerMove)
  state.el.removeEventListener('pointerup', onPointerUp)
  state.el.removeEventListener('pointercancel', onPointerCancel)
  try {
    state.el.releasePointerCapture(state.pointerId)
  } catch {
    // 指针已隐式释放，无需处理
  }

  const cancelled = event.type === 'pointercancel'
  const dx = (cancelled ? state.lastX : event.clientX) - state.startX
  const dy = (cancelled ? state.lastY : event.clientY) - state.startY
  suppressClick = state.moved
  state.el.style.willChange = ''

  // 送底阈值随卡宽自适应（18% 卡宽）；位移不够但甩得够快也算——
  // 缺了速度判据时，随手一拨这个最自然的手势等于白拖
  const span = commitSpan(state.width)
  const flicked =
    state.moved &&
    Math.hypot(dx, dy) > FLICK_MIN_PX &&
    Math.hypot(state.vx, state.vy) > props.flickVelocity
  const exceeded = flicked || Math.abs(dx) > span || Math.abs(dy) > span
  if (reducedMotion.value) {
    state.el.style.transform = ''
    if (exceeded) sendToBack(state.itemIndex)
    return
  }
  if (exceeded) sendToBack(state.itemIndex)
  if (!state.moved) return

  // 顶牌送底的同时飞回原位；松手速度带入弹簧，贴近原版手感
  const velocity = (Math.abs(dx) >= Math.abs(dy) ? state.vx : state.vy) * 1000
  releaseAnimation = animate(
    state.el,
    { x: [dx, 0], y: [dy, 0], rotateX: [-tiltOf(dy, span), 0], rotateY: [tiltOf(dx, span), 0] },
    {
      type: 'spring',
      stiffness: props.animationConfig.stiffness,
      damping: props.animationConfig.damping,
      velocity,
    }
  )
  void releaseAnimation.finished.then(() => {
    if (!dragging.value) state.el.style.transform = ''
  })
}

// ---------- 点击 / 键盘轮换 ----------

function onActivate(depth: number, itemIndex: number) {
  if (depth !== order.value.length - 1 || !clickToCycle.value) return
  if (suppressClick) {
    suppressClick = false
    return
  }
  sendToBack(itemIndex)
}

// ---------- 层叠姿态与顶层属性 ----------

function depthStyle(depth: number, itemIndex: number) {
  const len = order.value.length
  const rotate = (len - depth - 1) * props.rotationStep + (rotations.value[itemIndex] ?? 0)
  const scale = 1 + depth * props.scaleStep - len * props.scaleStep
  return {
    transform: `rotate(${rotate}deg) scale(${scale})`,
    transformOrigin: props.transformOrigin,
  }
}

function wrapperAttrs(depth: number): Record<string, unknown> {
  if (depth !== order.value.length - 1) {
    return { class: 'pointer-events-none', 'aria-hidden': 'true' }
  }
  const attrs: Record<string, unknown> = {
    // pan-y：触摸端横向滑动归拖拽、纵向滑动照常滚动页面（touch-action: none 会卡死页面滚动）
    class: dragDisabled.value ? 'cursor-pointer' : 'cursor-grab touch-pan-y active:cursor-grabbing',
  }
  if (clickToCycle.value) {
    attrs.role = 'button'
    attrs.tabindex = '0'
    attrs['aria-label'] = '切换到下一张'
  }
  return attrs
}

// ---------- 环境监听 ----------

function onReduceChange(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches
}

function checkMobile() {
  isMobile.value = window.innerWidth < props.mobileBreakpoint
}

function onVisibility() {
  pageHidden.value = document.hidden
}

onMounted(() => {
  reduceMq?.addEventListener?.('change', onReduceChange)
  window.addEventListener('resize', checkMobile)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  reduceMq?.removeEventListener?.('change', onReduceChange)
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('visibilitychange', onVisibility)
  releaseAnimation?.stop()
})
</script>

<template>
  <div
    class="relative w-full select-none [perspective:600px]"
    role="group"
    :aria-label="ariaLabel"
    @mouseenter="setHover(true)"
    @mouseleave="setHover(false)"
  >
    <div
      v-for="(itemIndex, depth) in order"
      :key="itemIndex"
      class="absolute inset-0"
      v-bind="wrapperAttrs(depth)"
      @pointerdown="onPointerDown($event, depth, itemIndex)"
      @click="onActivate(depth, itemIndex)"
      @keydown.enter.prevent="onActivate(depth, itemIndex)"
      @keydown.space.prevent="onActivate(depth, itemIndex)"
    >
      <div
        class="h-full w-full transition-transform duration-[450ms] ease-out-soft will-change-transform motion-reduce:transition-none"
        :style="depthStyle(depth, itemIndex)"
      >
        <slot
          name="card"
          :item="items[itemIndex]"
          :index="itemIndex"
        />
      </div>
    </div>
  </div>
</template>
