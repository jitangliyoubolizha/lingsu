// @vitest-environment jsdom
/**
 * 手势单测公共工具。jsdom 既没有 PointerEvent 也没有指针捕获实现，
 * 这里补最小可用版本，供 CardStack / useSwipeNavigate 等指针手势用例共用。
 */

/* jsdom 无 PointerEvent 时补一个仅含本测试所需字段的最小实现 */
export class TestPointerEvent extends MouseEvent {
  pointerId: number
  pointerType: string

  constructor(
    type: string,
    init: {
      clientX?: number
      clientY?: number
      pointerId?: number
      pointerType?: string
      bubbles?: boolean
      cancelable?: boolean
    } = {}
  ) {
    super(type, {
      bubbles: init.bubbles ?? true,
      cancelable: init.cancelable ?? true,
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
      button: 0,
    })
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'touch'
  }
}

const globals = window as unknown as { PointerEvent?: unknown } & Record<string, unknown>

if (typeof globals.PointerEvent !== 'function') {
  globals.PointerEvent = TestPointerEvent
}

/* 指针捕获：拖拽出元素外仍要收到事件，jsdom 未实现，补空实现即可 */
const elementProto = Element.prototype as unknown as Record<string, unknown>
if (typeof elementProto.setPointerCapture !== 'function') {
  elementProto.setPointerCapture = function setPointerCapture() {}
  elementProto.releasePointerCapture = function releasePointerCapture() {}
}

export type PointerPhase = 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel'

/** 派发指针事件；可注入 timeStamp 以模拟速度（useSwipeNavigate 读 event.timeStamp）。
 *  必须带 bubbles：手势可从子元素（按钮/链接）起滑、靠冒泡到达轨道监听，
 *  jsdom 原生 PointerEvent 默认不冒泡，会静默丢失这类起滑。 */
export function fire(
  el: Element,
  type: PointerPhase,
  x: number,
  y: number,
  timeStamp?: number
): void {
  const event = new (globals.PointerEvent as new (
    type: string,
    init: Record<string, unknown>
  ) => MouseEvent)(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
  })
  if (timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  }
  el.dispatchEvent(event)
}

/** jsdom 无布局，clientWidth 恒为 0；给单个元素注入宽度（随元素销毁自动失效，不污染全局） */
export function stubClientWidth(el: HTMLElement, width: number): void {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: width })
}
