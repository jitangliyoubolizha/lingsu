import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * 条文翻页方式：滑动整页翻页（pager）为「滑动已就位、换页瞬时」；
 * 键盘 / 底部链接为方向性滑入转场（next/prev）。导航起点写入，转场期间保持不变。
 */
export const clauseNavDirection = ref<'next' | 'prev' | 'pager' | null>(null)

/** 整页翻页滑动交接期间为 true：scrollBehavior 据此抑制回顶（落点保持当前阅读位置） */
export const pagerSettling = ref(false)

/** 进入当前条文时的来源页路径：返回键直达来源，不依赖可能被旧版翻条污染的历史栈 */
export const clauseEntryFrom = ref('/clauses')

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
/** 松手回弹时长（ms）：WAAPI 走合成器，不与翻页抢主线程 */
const REBOUND_MS = 200
/** 整页滑动交接时长（ms）：与新页就位衔接 */
const SETTLE_MS = 220
/** 与 --ease-out-soft 同曲线（cubic-bezier(0.22, 1, 0.36, 1)） */
const EASE_OUT_SOFT = 'cubic-bezier(0.22, 1, 0.36, 1)'
/** 动画落定兜底时长：无渲染帧环境（后台标签页等）finished 可能永不 resolve，超时直接就位 */
const SETTLE_FALLBACK_MS = 700
/** 松手后仍拦截随后的一次 click 的兜底时长（ms）：吞掉横滑结束时的误触点按 */
const CLICK_SUPPRESS_MS = 250

interface SwipeState {
  /** 跟踪的触点 identifier：多指同时按压时只认起手那一指 */
  touchId: number
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

/** TouchList/类数组按 identifier 找触点 */
function touchById(list: ArrayLike<Touch>, id: number): Touch | null {
  for (let i = 0; i < list.length; i++) {
    const touch = list[i]
    if (touch.identifier === id) return touch
  }
  return null
}

/**
 * 条文详情页整页横滑翻条（E-15）：拖动的是 [上一页｜当前页｜下一页] 轨道，
 * 相邻整页跟手跟入，松手过阈值整页滑动交接后瞬时换页（无第二次过渡）。
 * 手感对齐小说翻页：页面上任意位置（含按钮/链接）都能起滑，轻拖或轻甩即翻；
 * 仅响应单指触摸——鼠标拖拽与文本选择冲突，桌面走键盘 ←/→ 与底部链接。
 * 轨道需带 touch-pan-y，纵向滚动始终归浏览器（约定同 CardStack §4.2）。
 *
 * 为什么用 Touch Events 而不是 Pointer Events（勿回退）：
 * iOS WebKit 对 Pointer Events 的触摸管线有缺陷——即使 touch-action: pan-y、
 * 即使后续 touchmove preventDefault，Safari 仍会把水平拖动判为页面平移并
 * pointercancel 掐断事件流（Chrome 模拟器一切正常，iPhone 真机完全滑不动，
 * 真机实测确认）。Touch Events 是唯一在 iOS/Android 行为一致的输入层，
 * 也是 Swiper 等成熟库的共同选择。
 *
 * 其余真机要点：
 * 1. 回弹/交接动画用原生 WAAPI 且全程 translate3d——JS 动画库写 2D translateX 会在
 *    交接中途把巨型轨道从合成层降级，逐帧重新光栅化（真机闪烁主因之一）；
 * 2. 翻页提交后组件按路由 key 换实例，离开页残影帧必须保持落点画面（新条文就在屏上），
 *    卸载时不得把轨道归位——归位会让残影帧显示上一条内容（闪烁主因之二）；
 * 3. 按压期间拦截 selectstart/contextmenu——慢速横滑从文字起手时，长按文本选择/长按菜单
 *    会抢走手势，表现为「只有空白区域能滑动」。
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
  let flight: Animation | null = null
  /** 交接动画进行中，忽略新的拖动。提交后组件随路由换实例销毁，无需复位 */
  let settling = false
  /** 横滑结束后布防：拦截紧随其后的那次 click，防止起手在按钮/链接上时误触。
   *  下一次 touchstart（新交互开始）或第一个 click 到达即解除，250ms 仅作兜底 */
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

  /** 按压期间禁掉文本选择与长按菜单：慢滑从文字/链接起手时长按选择会抢走手势 */
  function preventSelectionSteal(event: Event) {
    event.preventDefault()
  }

  /**
   * 回弹/交接动画：原生 WAAPI + 全程 translate3d（保持合成层不降级）。
   * jsdom 等无 WAAPI 环境返回 null，由 settleWithFallback 直接就位。
   */
  function animateTrack(node: HTMLElement, from: number, to: number, durationMs: number): Animation | null {
    if (typeof node.animate !== 'function') return null
    return node.animate(
      [
        { transform: `translate3d(${from}px, 0, 0)` },
        { transform: `translate3d(${to}px, 0, 0)` },
      ],
      { duration: durationMs, easing: EASE_OUT_SOFT, fill: 'forwards' }
    )
  }

  function onTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return
    if (state || settling || !el.value || inFormField(event.target)) return
    // 新交互开始：上一次横滑的 click 拦截立即解除，紧随的正当点按不受影响
    disarmClickSuppression()
    // 抓到进行中的回弹动画则停掉并归位，避免拖拽起点跳变
    flight?.cancel()
    flight = null
    const touch = event.touches[0]
    state = {
      touchId: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      width: pageWidth(),
      lastX: touch.clientX,
      lastT: event.timeStamp,
      vx: 0,
      active: false,
      base: -(pageWidth() + SLOT_GAP),
    }
    const node = el.value
    // touchmove 必须非 passive：水平意图成立后 preventDefault 阻止浏览器抢手势，
    // 这是 iOS 上自定义横滑能动起来的前提；未判定前不阻止，纵向滚动不受影响
    node.addEventListener('touchmove', onTouchMove, { passive: false })
    node.addEventListener('touchend', onTouchEnd, { passive: true })
    node.addEventListener('touchcancel', onTouchCancel, { passive: true })
    // selectstart/contextmenu 可取消且非 passive：拦住长按选择/长按菜单抢手势
    node.addEventListener('selectstart', preventSelectionSteal)
    node.addEventListener('contextmenu', preventSelectionSteal)
    node.addEventListener('click', onClickCapture, true)
  }

  function onTouchMove(event: TouchEvent) {
    if (!state || !el.value) return
    const touch =
      touchById(event.changedTouches, state.touchId) ?? touchById(event.touches, state.touchId)
    if (!touch) return
    const node = el.value
    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY
    if (!state.active) {
      if (Math.abs(dx) < INTENT_PX || Math.abs(dx) <= Math.abs(dy)) return
      state.active = true
      // 意图成立才提升图层：巨型轨道只在跟手期间驻留合成层
      node.style.willChange = 'transform'
      // 手势期间关掉吸顶栏 backdrop-blur（随轨道位移逐帧重采样背景，真机闪烁/掉帧源）
      node.classList.add('pager-swiping')
    }
    // 水平意图成立：阻止浏览器把这次拖动用于滚动/系统手势（iOS 关键，勿删）
    event.preventDefault()

    const dt = event.timeStamp - state.lastT
    if (dt > 0) {
      state.vx = 0.8 * state.vx + 0.2 * ((touch.clientX - state.lastX) / dt)
      state.lastX = touch.clientX
      state.lastT = event.timeStamp
    }

    // 纯 translate3d：逐帧只重组不重绘。整页轨道高逾数屏，任何逐帧变化的 3D/缩放
    // 变换都会迫使浏览器每帧重新光栅化整块巨型图层（实测为横滑卡顿主因）
    const offset = dragOffset(dx)
    node.style.transform = `translate3d(${(state.base + offset).toFixed(2)}px, 0, 0)`
  }

  function onTouchEnd(event: TouchEvent) {
    if (!state) return
    const touch = touchById(event.changedTouches, state.touchId)
    if (!touch) return
    finishDrag(touch.clientX, false)
  }

  function onTouchCancel(event: TouchEvent) {
    if (!state) return
    if (!touchById(event.changedTouches, state.touchId)) return
    // touchcancel 时触点坐标不可靠，用最后已知位置归位
    finishDrag(NaN, true)
  }

  function pageWidth(): number {
    return el.value?.clientWidth || window.innerWidth
  }

  /** 尽头方向的有效位移按阻尼折算：第一条往右 / 最后一条往左只轻微跟手 */
  function dragOffset(dx: number): number {
    const atEdge = (dx > 0 && !options.canPrev()) || (dx < 0 && !options.canNext())
    return atEdge ? dx * EDGE_DAMPING : dx
  }

  function detach(node: HTMLElement) {
    node.removeEventListener('touchmove', onTouchMove)
    node.removeEventListener('touchend', onTouchEnd)
    node.removeEventListener('touchcancel', onTouchCancel)
    node.removeEventListener('selectstart', preventSelectionSteal)
    node.removeEventListener('contextmenu', preventSelectionSteal)
  }

  function finishDrag(clientX: number, cancelled: boolean) {
    const s = state
    if (!s || !el.value) return
    state = null
    const node = el.value
    detach(node)
    // will-change 不在此时释放：交接动画期间图层降级会迫使整条三页轨道重新光栅化
    // （真机上的闪烁源），改由 settleWithFallback 在动画落定后释放
    // 横滑成立：布防拦截紧随 touchend 的那次 click（真实浏览器中必然派发，可能落在组件上）
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
        flight = animateTrack(node, s.base + dx, s.base, REBOUND_MS)
        settleWithFallback(node, s.base, flight, clearTransform)
      } else {
        // 未通过意图判定（点按）：无动画可等，图层当场释放
        node.style.willChange = ''
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
      flight = animateTrack(node, s.base + dx, target, SETTLE_MS)
      settleWithFallback(node, target, flight, () => {
        vibrateTick()
        options.onNavigate(dir)
      })
    } else {
      flight = animateTrack(node, s.base + dx, s.base, REBOUND_MS)
      settleWithFallback(node, s.base, flight, clearTransform)
    }
  }

  /** 等动画落定后把轨道放到 target；无帧环境超时直接就位，不再等 finished */
  function settleWithFallback(
    node: HTMLElement,
    target: number,
    animation: Animation | null,
    onDone: () => void
  ) {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      // 组件已随翻页换实例卸载：不写样式、不回调（防止重复触发导航）
      if (el.value !== node) return
      // 撤掉 forwards 填充：否则驻留动画会盖过内联样式，后续拖拽的逐帧位移全部失效
      try {
        animation?.cancel()
      } catch {
        // 动画已结束，cancel 为空操作
      }
      node.style.transform = `translate3d(${target}px, 0, 0)`
      // 动画落定后才释放图层：交接途中降级会让整条轨道重新光栅化
      node.style.willChange = ''
      node.classList.remove('pager-swiping')
      onDone()
    }
    const timer = setTimeout(finish, SETTLE_FALLBACK_MS)
    void (animation?.finished ?? Promise.resolve()).then(finish, finish)
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
    flight?.cancel()
    flight = null
    state = null
    disarmClickSuppression()
    if (el.value) {
      detach(el.value)
      el.value.removeEventListener('click', onClickCapture, true)
      // 不把轨道 transform 归位：翻页换实例时离开页还有残影帧，保持落点画面
      // （新条文就在屏上）才能与新页无缝衔接；归位会让残影帧闪回上一条。
      // 元素随卸载销毁，样式无需清理。
    }
  })

  return {
    /** v-bind 到翻页轨道元素；初始位移 -100%（居中当前页）由模板静态样式提供 */
    swipeBindings: { onTouchstart: onTouchStart },
  }
}
