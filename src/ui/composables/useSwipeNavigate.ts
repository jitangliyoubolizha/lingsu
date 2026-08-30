import { animate } from 'motion'
import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * 条文翻页方式：滑动整页翻页（pager）为「滑动已就位、换页瞬时」；
 * 键盘 / 底部链接为方向性滑入转场（next/prev）。导航起点写入，转场期间保持不变。
 */
export const clauseNavDirection = ref<'next' | 'prev' | 'pager' | null>(null)

/** 整页翻页滑动交接期间为 true：scrollBehavior 据此抑制回顶（落点保持当前阅读位置） */
export const pagerSettling = ref(false)

/** 水平意图判定：横移超过该像素且大于纵移才接管（起手要跟手，小说翻页手感） */
const INTENT_PX = 4
/** 松手翻页距离阈值（页宽占比）：手机上约一指轻拖即可翻页 */
const COMMIT_RATIO = 0.13
/** px/ms，快甩判定：距离不够但速度够也翻页（轻甩即翻） */
const FLICK_VELOCITY = 0.24
/** 无相邻条文方向的跟手阻尼（尽头 rubber-band） */
const EDGE_DAMPING = 0.3
/** 页间距（与轨道 gap-6 一致）：静止时相邻页被推出屏幕外，不侵入两侧边距带 */
const SLOT_GAP = 24
/** 松手回弹：短促 ease-out 走 WAAPI 合成器（JS 弹簧逐帧跑主线程，与翻页抢帧） */
const REBOUND_DURATION = 0.2
/** 整页滑动交接：时长与新页就位衔接 */
const SETTLE_DURATION = 0.22
/** 动画落定兜底时长：无渲染帧环境（后台标签页等）finished 可能永不 resolve，超时直接就位 */
const SETTLE_FALLBACK_MS = 700
/** 与 --ease-out-soft 同曲线，供 motion 动画使用 */
const EASE_OUT_SOFT = [0.22, 1, 0.36, 1] as const
/** 松手后仍拦截随后的一次 click 的兜底时长（ms）：吞掉横滑结束时的误触点按 */
const CLICK_SUPPRESS_MS = 250

interface SwipeState {
  pointerId: number
  startX: number
  startY: number
  /** 按下时缓存的页宽：拖动中不读 clientWidth，避免逐帧强制样式计算 */
  width: number
  lastX: number
  lastT: number
  /** px/ms，一阶低通平滑，供回弹/交接动画带入初速度 */
  vx: number
  /** 已通过水平意图判定，开始跟手 */
  active: boolean
  /** 拖动起点轨道偏移（居中页为负的一个页宽） */
  base: number
}

/** 手势起点落在表单控件内时不启动，避免与输入、文本选择冲突 */
function inFormField(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('textarea, input, select, [contenteditable]') !== null
  )
}

/**
 * 条文详情页整页横滑翻条（E-15）：拖动的是 [上一页｜当前页｜下一页] 轨道，
 * 相邻整页跟手跟入，松手过阈值整页滑动交接后瞬时换页（无第二次过渡）。
 * 手感对齐小说翻页：页面上任意位置（含按钮/链接）都能起滑，轻拖或轻甩即翻；
 * 仅响应触摸/笔——鼠标拖拽与文本选择冲突，桌面走键盘 ←/→ 与底部链接。
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
  /** 横滑结束后布防：拦截紧随其后的那次 click，防止起手在按钮/链接上时误触。
   *  下一次 pointerdown（新交互开始）或第一个 click 到达即解除，250ms 仅作兜底 */
  let suppressNextClick = false
  let suppressTimer: ReturnType<typeof setTimeout> | undefined

  function onClickCapture(event: MouseEvent) {
    if (!suppressNextClick) return
    suppressNextClick = false
    clearTimeout(suppressTimer)
    event.preventDefault()
    event.stopPropagation()
  }

  function disarmClickSuppression() {
    suppressNextClick = false
    clearTimeout(suppressTimer)
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === 'mouse' || event.button !== 0) return
    if (state || settling || !el.value || inFormField(event.target)) return
    // 新交互开始：上一次横滑的 click 拦截立即解除，紧随的正当点按不受影响
    disarmClickSuppression()
    // 抓到进行中的回弹动画则停掉并归位，避免拖拽起点跳变
    flight?.stop()
    flight = null
    state = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: pageWidth(),
      lastX: event.clientX,
      lastT: event.timeStamp,
      vx: 0,
      active: false,
      base: -(pageWidth() + SLOT_GAP),
    }
    // 全程只写 transform、不读布局、不阻止默认行为，监听标 passive 让合成器自由调度
    const node = el.value
    node.addEventListener('pointermove', onPointerMove, { passive: true })
    node.addEventListener('pointerup', onPointerUp, { passive: true })
    node.addEventListener('pointercancel', onPointerCancel, { passive: true })
    node.addEventListener('click', onClickCapture, true)
  }

  function onPointerMove(event: PointerEvent) {
    if (!state || event.pointerId !== state.pointerId || !el.value) return
    const node = el.value
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.active) {
      if (Math.abs(dx) < INTENT_PX || Math.abs(dx) <= Math.abs(dy)) return
      state.active = true
      // 意图成立才占用指针并提升图层：起手在按钮/链接上时，横向滑动改为翻页而非误触
      node.style.willChange = 'transform'
      try {
        node.setPointerCapture(state.pointerId)
      } catch {
        // 无实现环境仅影响隐式捕获，不影响显式监听
      }
    }
    const dt = event.timeStamp - state.lastT
    if (dt > 0) {
      state.vx = 0.8 * state.vx + 0.2 * ((event.clientX - state.lastX) / dt)
      state.lastX = event.clientX
      state.lastT = event.timeStamp
    }

    // 纯 translate3d：逐帧只重组不重绘。整页轨道高逾数屏，任何逐帧变化的 3D/缩放
    // 变换都会迫使浏览器每帧重新光栅化整块巨型图层（实测为横滑卡顿主因）
    const offset = dragOffset(dx)
    node.style.transform = `translate3d(${(state.base + offset).toFixed(2)}px, 0, 0)`
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

  function detach(node: HTMLElement, pointerId?: number) {
    node.removeEventListener('pointermove', onPointerMove)
    node.removeEventListener('pointerup', onPointerUp)
    node.removeEventListener('pointercancel', onPointerCancel)
    if (pointerId !== undefined) {
      try {
        node.releasePointerCapture(pointerId)
      } catch {
        // 指针已隐式释放，无需处理
      }
    }
  }

  function finishDrag(clientX: number, cancelled: boolean, pointerId: number) {
    const s = state
    if (!s || pointerId !== s.pointerId || !el.value) return
    state = null
    const node = el.value
    detach(node, s.active ? pointerId : undefined)
    node.style.willChange = ''
    // 横滑成立：布防拦截紧随 pointerup 的那次 click（真实浏览器中必然派发，可能落在组件上）
    if (s.active) {
      suppressNextClick = true
      clearTimeout(suppressTimer)
      suppressTimer = setTimeout(() => {
        suppressNextClick = false
      }, CLICK_SUPPRESS_MS)
    }

    const x = Number.isNaN(clientX) ? s.lastX : clientX
    const dx = dragOffset(x - s.startX)
    // 未通过意图判定（点按）或被系统打断（转为纵向滚动）：安静归位即可
    if (!s.active || cancelled) {
      if (node.style.transform) {
        flight = animate(node, { x: [s.base + dx, s.base] }, {
          duration: REBOUND_DURATION,
          ease: [...EASE_OUT_SOFT],
        })
        settleWithFallback(node, s.base, clearTransform)
      }
      return
    }

    const width = s.width
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
      flight = animate(node, { x: [s.base + dx, s.base] }, {
        duration: REBOUND_DURATION,
        ease: [...EASE_OUT_SOFT],
      })
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
    disarmClickSuppression()
    if (el.value) {
      detach(el.value)
      el.value.removeEventListener('click', onClickCapture, true)
      el.value.style.transform = 'translate3d(calc(-100% - 24px), 0, 0)'
      el.value.style.willChange = ''
    }
  })

  return {
    /** v-bind 到翻页轨道元素；初始位移 -100%（居中当前页）由模板静态样式提供 */
    swipeBindings: { onPointerdown: onPointerDown },
  }
}
