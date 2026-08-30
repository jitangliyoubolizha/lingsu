<!--
  React Bits「Stack」组件的 Vue 3 移植版（原版 MIT，reactbits.dev）。
  与原版差异：交互限定在顶牌（下层牌几乎被完全覆盖）；随机角每张牌只生成一次；
  扇形角度/缩放步进可配（宽卡场景调小步进以防卡片溢出容器）；
  释放回弹用 motion 的框架无关 vanilla API（带松手速度的弹簧），层叠姿态变化走 CSS 过渡。
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
    /** 拖拽位移超过该像素数即把顶牌送到底层；触摸端取 min(该值, 40% 卡宽) */
    sensitivity?: number
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
    sensitivity: 200,
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
  pointerType: PointerEvent['pointerType']
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  /** px/ms，一阶低通平滑，用于给回弹弹簧带入初速度 */
  vx: number
  vy: number
  moved: boolean
}

let drag: DragState | null = null
let releaseAnimation: ReturnType<typeof animate> | null = null
let suppressClick = false

/** 原版映射：位移 ±100px → 3D 倾斜 ∓60° */
function tiltOf(offset: number): number {
  return (Math.max(-100, Math.min(100, offset)) / 100) * 60
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
    pointerType: event.pointerType,
    startX: event.clientX,
    startY: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    lastT: event.timeStamp,
    vx: 0,
    vy: 0,
    moved: false,
  }
  dragging.value = true
  el.setPointerCapture(event.pointerId)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', onPointerUp)
  el.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return
  const dx = event.clientX - drag.startX
  const dy = event.clientY - drag.startY
  if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true
  const dt = event.timeStamp - drag.lastT
  if (dt > 0) {
    drag.vx = 0.8 * drag.vx + 0.2 * ((event.clientX - drag.lastX) / dt)
    drag.vy = 0.8 * drag.vy + 0.2 * ((event.clientY - drag.lastY) / dt)
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    drag.lastT = event.timeStamp
  }
  drag.el.style.transform = `translate3d(${dx}px, ${dy}px, 0px) rotateX(${-tiltOf(dy)}deg) rotateY(${tiltOf(dx)}deg)`
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

  // 触摸端阈值随卡宽自适应（40%）：固定 290px 在窄屏卡片上几乎滑不到；
  // 鼠标端保持 prop 原值
  const threshold =
    state.pointerType === 'mouse'
      ? props.sensitivity
      : Math.min(props.sensitivity, state.el.clientWidth * 0.4)
  const exceeded = Math.abs(dx) > threshold || Math.abs(dy) > threshold
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
    { x: [dx, 0], y: [dy, 0], rotateX: [-tiltOf(dy), 0], rotateY: [tiltOf(dx), 0] },
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
