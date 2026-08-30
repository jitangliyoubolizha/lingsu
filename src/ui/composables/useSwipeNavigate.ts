import { animate } from 'motion'
import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * 条文翻页方式：滑动整页翻页（pager）为「滑动已就位、换页瞬时」；
 * 键盘 / 底部链接为方向性滑入转场（next/prev）。导航起点写入，转场期间保持不变。
 */
export const clauseNavDirection = ref<'next' | 'prev' | 'pager' | null>(null)

/** 整页翻页滑动交接期间为 true：scrollBehavior 据此抑制回顶（落点保持当前阅读位置） */
export const pagerSettling = ref(false)

/** 水平意图判定：横移超过该像素且大于纵移才接管（之前交给纵向滚动） */
const INTENT_PX = 8
/** 松手翻页距离阈值（页宽占比） */
const COMMIT_RATIO = 0.25
/** px/ms，快甩判定：距离不够但速度够也翻页 */
const FLICK_VELOCITY = 0.5
/** 无相邻条文方向的跟手阻尼（尽头 rubber-band） */
const EDGE_DAMPING = 0.3
/** 页间距（与轨道 gap-6 一致）：静止时相邻页被推出屏幕外，不侵入两侧边距带 */
const SLOT_GAP = 24
/** 拖动 3D 倾斜上限（deg）：整页微倾即可，过大会晕 */
const MAX_TILT = 4
/** 拖动时轻微缩小，营造「纸页被掀起」的抬手感 */
const DRAG_SCALE = 0.012
/** 松手回弹弹簧：整页比卡片堆更重，用比 CardStack（260/20）更软的参数 */
const REBOUND_SPRING = { type: 'spring' as const, stiffness: 210, damping: 22 }
/** 整页滑动交接：时长与新页就位衔接 */
const SETTLE_DURATION = 0.26
/** 动画落定兜底时长：无渲染帧环境（后台标签页等）finished 可能永不 resolve，超时直接就位 */
const SETTLE_FALLBACK_MS = 700
/** 与 --ease-out-soft 同曲线，供 motion 动画使用 */
const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const

interface SwipeState {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastT: number
  /** px/ms，一阶低通平滑，供回弹/交接动画带入初速度 */
  vx: number
  /** 已通过水平意图判定，开始跟手 */
  active: boolean
  /** 拖动起点轨道偏移（居中页为负的一个页宽） */
  base: number
}

/** 手势起点落在交互元素内时不启动，避免与点击、输入、文本选择冲突 */
function inInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('a, button, textarea, input, select, [contenteditable]') !== null
  )
}

/**
 * 条文详情页整页横滑翻条（E-15）：拖动的是 [上一页｜当前页｜下一页] 轨道，
 * 相邻整页跟手跟入，松手过阈值整页滑动交接后瞬时换页（无第二次过渡）。
 * 仅响应触摸/笔——鼠标拖拽会与文本选择冲突，桌面走键盘 ←/→ 与底部链接；
 * 轨道需带 touch-pan-y，纵向滚动始终归浏览器（约定同 CardStack §4.2）。
 */
export function useSwipeNavigate(
  el: Ref<HTMLElement | null>,
  options: {
    canPrev: () => boolean
    canNext: () => boolean
    /** 滑动交接完成后调用（此时新页已在轨道上就位） */
    onNavigate: (dir: 'next' | 'prev') => void
  }
) {
  let state: SwipeState | null = null
  let flight: ReturnType<typeof animate> | null = null
  /** 交接动画进行中，忽略新的拖动 */
  let settling = false

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' || event.button !== 0) return
    if (state || settling || !el.value || inInteractive(event.target)) return
    // 抓到进行中的回弹动画则停掉并归位，避免拖拽起点跳变
    flight?.stop()
    flight = null
    const width = pageWidth()
    state = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      active: false,
      base: -(width + SLOT_GAP),
    }
    try {
      el.value.setPointerCapture(event.pointerId)
    } catch {
      // 无实现环境（jsdom 等）仅影响隐式捕获，不影响显式监听
    }
    el.value.addEventListener('pointermove', onPointerMove)
    el.value.addEventListener('pointerup', onPointerUp)
    el.value.addEventListener('pointercancel', onPointerCancel)
  }

  function onPointerMove(event: PointerEvent) {
    if (!state || event.pointerId !== state.pointerId || !el.value) return
    const node = el.value
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.active) {
      if (Math.abs(dx) < INTENT_PX || Math.abs(dx) <= Math.abs(dy)) return
      state.active = true
      node.style.willChange = 'transform'
    }
    const dt = event.timeStamp - state.lastT
    if (dt > 0) {
      state.vx = 0.8 * state.vx + 0.2 * ((event.clientX - state.lastX) / dt)
      state.lastX = event.clientX
      state.lastT = event.timeStamp
    }

    const width = pageWidth()
    const offset = dragOffset(dx)
    const progress = Math.min(Math.abs(dx) / (width * COMMIT_RATIO), 1)
    const tilt = Math.max(-1, Math.min(1, dx / width)) * MAX_TILT
    const scale = 1 - DRAG_SCALE * progress
    node.style.transform = `translate3d(${state.base + offset}px, 0, 0) perspective(1100px) rotateY(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`
  }

  function onPointerUp(event: PointerEvent) {
    finishDrag(event.clientX, false, event.pointerId)
  }

  function onPointerCancel(event: PointerEvent) {
    // pointercancel 时 clientX 不可靠，用最后已知位置归位
    finishDrag(NaN, true, event.pointerId)
  }

  function pageWidth(): number {
    return el.value?.clientWidth || window.innerWidth
  }

  /** 尽头方向的有效位移按阻尼折算：第一条往右 / 最后一条往左只轻微跟手 */
  function dragOffset(dx: number): number {
    const atEdge = (dx > 0 && !options.canPrev()) || (dx < 0 && !options.canNext())
    return atEdge ? dx * EDGE_DAMPING : dx
  }

  function finishDrag(clientX: number, cancelled: boolean, pointerId: number) {
    const s = state
    if (!s || pointerId !== s.pointerId || !el.value) return
    state = null
    const node = el.value
    node.removeEventListener('pointermove', onPointerMove)
    node.removeEventListener('pointerup', onPointerUp)
    node.removeEventListener('pointercancel', onPointerCancel)
    try {
      node.releasePointerCapture(pointerId)
    } catch {
      // 指针已隐式释放，无需处理
    }
    node.style.willChange = ''

    const x = Number.isNaN(clientX) ? s.lastX : clientX
    const dx = dragOffset(x - s.startX)
    // 未通过意图判定（点按）或被系统打断（转为纵向滚动）：安静归位即可
    if (!s.active || cancelled) {
      if (node.style.transform) {
        flight = animate(
          node,
          { x: [s.base + dx, s.base] },
          { ...REBOUND_SPRING, velocity: s.vx * 1000 }
        )
        settleWithFallback(node, s.base, clearTransform)
      }
      return
    }

    const width = pageWidth()
    const dir: 'next' | 'prev' | null = dx < 0 ? 'next' : dx > 0 ? 'prev' : null
    const committed =
      dir !== null &&
      (Math.abs(dx) > width * COMMIT_RATIO || Math.abs(s.vx) > FLICK_VELOCITY) &&
      (dir === 'next' ? options.canNext() : options.canPrev())

    if (dir && committed) {
      // 整页滑动交接：轨道滑到相邻页就位（页距 = 页宽 + 间距），完成后瞬时换页
      settling = true
      pagerSettling.value = true
      const pitch = width + SLOT_GAP
      const target = dir === 'next' ? s.base - pitch : s.base + pitch
      flight = animate(
        node,
        { x: [s.base + dx, target] },
        { duration: SETTLE_DURATION, ease: [...EASE_OUT_SOFT] }
      )
      settleWithFallback(node, target, () => {
        vibrateTick()
        options.onNavigate(dir)
      })
    } else {
      flight = animate(
        node,
        { x: [s.base + dx, s.base] },
        { ...REBOUND_SPRING, velocity: s.vx * 1000 }
      )
      settleWithFallback(node, s.base, clearTransform)
    }
  }

  /** 等动画落定后把轨道放到 target；无帧环境超时直接就位，不再等 finished */
  function settleWithFallback(node: HTMLElement, target: number, onDone: () => void) {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      if (el.value === node) {
        node.style.transform = `translate3d(${target}px, 0, 0)`
      }
      onDone()
    }
    const timer = setTimeout(finish, SETTLE_FALLBACK_MS)
    void (flight?.finished ?? Promise.resolve()).then(
      () => {
        clearTimeout(timer)
        finish()
      },
      () => {
        clearTimeout(timer)
        finish()
      }
    )
  }

  function clearTransform() {
    if (!state) {
      const node = el.value
      if (node) node.style.transform = 'translate3d(calc(-100% - 24px), 0, 0)'
    }
  }

  /** 翻页成功的触觉确认；不支持的平台（iOS Safari/桌面）静默跳过 */
  function vibrateTick() {
    try {
      navigator.vibrate?.(8)
    } catch {
      // 无振动权限或实现不可用
    }
  }

  onBeforeUnmount(() => {
    flight?.stop()
    flight = null
    state = null
    if (el.value) {
      el.value.removeEventListener('pointermove', onPointerMove)
      el.value.removeEventListener('pointerup', onPointerUp)
      el.value.removeEventListener('pointercancel', onPointerCancel)
      el.value.style.transform = 'translate3d(calc(-100% - 24px), 0, 0)'
      el.value.style.willChange = ''
    }
  })

  return {
    /** v-bind 到翻页轨道元素；初始位移 -100%（居中当前页）由模板静态样式提供 */
    swipeBindings: { onPointerdown: onPointerDown },
  }
}
