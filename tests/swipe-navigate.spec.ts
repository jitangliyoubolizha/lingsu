// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSwipeNavigate } from '../src/ui/composables/useSwipeNavigate'

const animateMock = vi.hoisted(() => vi.fn(() => ({ stop: vi.fn(), finished: Promise.resolve() })))

vi.mock('motion', () => ({ animate: animateMock }))

/* jsdom 无 PointerEvent 时补一个仅含本测试所需字段的最小实现 */
class TestPointerEvent extends MouseEvent {
  pointerId: number
  pointerType: string

  constructor(
    type: string,
    init: { clientX?: number; clientY?: number; pointerId?: number; pointerType?: string } = {}
  ) {
    super(type, {
      bubbles: true,
      cancelable: true,
      clientX: init.clientX ?? 0,
      clientY: init.clientY ?? 0,
      button: 0,
    })
    this.pointerId = init.pointerId ?? 1
    this.pointerType = init.pointerType ?? 'touch'
  }
}

if (typeof window.PointerEvent !== 'function') {
  ;(window as unknown as { PointerEvent: unknown }).PointerEvent = TestPointerEvent
}

/** 派发指针事件；可注入 timeStamp 以模拟快甩速度（px/ms） */
function fire(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  timeStamp?: number
) {
  const event = new (window.PointerEvent as unknown as typeof TestPointerEvent)(type, {
    clientX: x,
    clientY: y,
  })
  if (timeStamp !== undefined) {
    Object.defineProperty(event, 'timeStamp', { value: timeStamp })
  }
  el.dispatchEvent(event)
}

interface HarnessProps {
  canPrev?: boolean
  canNext?: boolean
}

const Harness = defineComponent({
  props: {
    canPrev: { type: Boolean, default: true },
    canNext: { type: Boolean, default: true },
  },
  emits: { navigate: (dir: 'next' | 'prev') => typeof dir === 'string' },
  setup(props, { emit }) {
    const el: Ref<HTMLElement | null> = ref(null)
    const { swipeBindings } = useSwipeNavigate(el, {
      canPrev: () => props.canPrev,
      canNext: () => props.canNext,
      onNavigate: (dir) => emit('navigate', dir),
    })
    return () =>
      h('div', { 'data-test': 'root' }, [
        h('div', { ref: el, 'data-test': 'track', ...swipeBindings }, [
          h('div', { 'data-test': 'page-prev' }, 'prev'),
          h('div', { 'data-test': 'page-current' }, [
            h('button', { 'data-test': 'btn' }, '按钮'),
            h('textarea', { 'data-test': 'ta' }),
          ]),
          h('div', { 'data-test': 'page-next' }, 'next'),
        ]),
      ])
  },
})

// jsdom 无布局：轨道 clientWidth 为 0，页宽取 window.innerWidth（默认 1024），
// 拖动基准位移 base = -(1024 + 24 页间距) = -1048，翻页距离阈值 = 1024 × 25% = 256px

function mountHarness(props: HarnessProps = {}) {
  return mount(Harness, { props })
}

describe('useSwipeNavigate 整页横滑翻条', () => {
  afterEach(() => {
    animateMock.mockClear()
  })

  it('横向拖动超过阈值，整页滑动交接后翻到下一条', async () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 480, 300, 10) // 通过水平意图判定
    fire(track, 'pointermove', 200, 300, 50) // dx = -300 > 256
    fire(track, 'pointerup', 200, 300, 60)
    await vi.waitFor(() => expect(wrapper.emitted('navigate')).toEqual([['next']]))
    wrapper.unmount()
  })

  it('反向拖动翻到上一条', async () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 200, 300)
    fire(track, 'pointermove', 220, 300, 10)
    fire(track, 'pointermove', 500, 300, 50) // dx = +300 > 256
    fire(track, 'pointerup', 500, 300, 60)
    await vi.waitFor(() => expect(wrapper.emitted('navigate')).toEqual([['prev']]))
    wrapper.unmount()
  })

  it('拖动中轨道纯位移跟手（合成器友好，无逐帧 3D 变换）', () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 480, 300, 10)
    fire(track, 'pointermove', 400, 300, 50) // dx = -100
    expect(track.style.transform).toContain('translate3d(-1148.00px') // base(-1048) + dx(-100)
    // 巨型轨道上逐帧变化的 3D/缩放变换会迫使每帧重新光栅化（卡顿主因），保持纯位移
    expect(track.style.transform).not.toContain('rotateY')
    expect(track.style.transform).not.toContain('perspective')
    expect(track.style.transform).not.toContain('scale')
    fire(track, 'pointerup', 400, 300, 60)
    wrapper.unmount()
  })

  it('距离不够但快速一甩也翻页', async () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300, 0)
    fire(track, 'pointermove', 450, 300, 50) // vx ≈ -0.2
    fire(track, 'pointermove', 380, 300, 100) // vx ≈ -0.44
    fire(track, 'pointermove', 370, 300, 110) // vx ≈ -0.55，超过 0.5
    fire(track, 'pointerup', 370, 300, 120) // dx = -130，不足阈值
    await vi.waitFor(() => expect(wrapper.emitted('navigate')).toEqual([['next']]))
    wrapper.unmount()
  })

  it('纵向为主的拖动不翻页、不留位移', () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 495, 380, 10) // dx = -5，未过意图判定
    fire(track, 'pointermove', 490, 520, 50) // dx = -10 < dy = 220
    fire(track, 'pointerup', 490, 520, 60)
    expect(wrapper.emitted('navigate')).toBeUndefined()
    expect(wrapper.get<HTMLElement>('[data-test="track"]').element.style.transform).toBe('')
    wrapper.unmount()
  })

  it('起点落在按钮/输入框内时不启动手势', () => {
    const wrapper = mountHarness()
    const button = wrapper.get('[data-test="btn"]').element
    const textarea = wrapper.get('[data-test="ta"]').element
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    for (const start of [button, textarea]) {
      fire(start, 'pointerdown', 500, 300)
      fire(track, 'pointermove', 200, 300, 10)
      fire(track, 'pointerup', 200, 300, 50)
    }
    expect(wrapper.emitted('navigate')).toBeUndefined()
    expect(wrapper.get<HTMLElement>('[data-test="track"]').element.style.transform).toBe('')
    wrapper.unmount()
  })

  it('尽头方向加阻尼且不触发导航', () => {
    const wrapper = mountHarness({ canNext: false })
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 480, 300, 10)
    fire(track, 'pointermove', 100, 300, 50) // 原始 dx = -400，阻尼后 -120 < 256
    fire(track, 'pointerup', 100, 300, 60)
    expect(wrapper.emitted('navigate')).toBeUndefined()
    // 跟手过则必有回弹动画
    expect(animateMock).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('翻页提交触发触觉震动', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 480, 300, 10)
    fire(track, 'pointermove', 200, 300, 50)
    fire(track, 'pointerup', 200, 300, 60)
    await vi.waitFor(() => expect(vibrate).toHaveBeenCalledWith(8))
    wrapper.unmount()
  })

  it('被系统打断（转为纵向滚动）时安静归位', () => {
    const wrapper = mountHarness()
    const track = wrapper.get<HTMLElement>('[data-test="track"]').element
    fire(track, 'pointerdown', 500, 300)
    fire(track, 'pointermove', 400, 300, 10)
    fire(track, 'pointercancel', 400, 300, 20)
    expect(wrapper.emitted('navigate')).toBeUndefined()
    expect(animateMock).toHaveBeenCalled()
    wrapper.unmount()
  })
})
