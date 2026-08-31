// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

import CardStack from '../src/ui/components/CardStack.vue'
import { fire, stubClientWidth } from './helpers/pointer'

const animateMock = vi.hoisted(() => vi.fn(() => ({ stop: vi.fn(), finished: Promise.resolve() })))

vi.mock('motion', () => ({ animate: animateMock }))

interface StackItem {
  no: number
  text: string
}

const items: StackItem[] = [
  { no: 1, text: '第一条' },
  { no: 2, text: '第二条' },
  { no: 3, text: '第三条' },
]

function mountStack(extraProps: Record<string, unknown> = {}) {
  return mount(CardStack, {
    props: { items, ...extraProps },
    slots: {
      card: ({ item }: { item: unknown }) =>
        h('figure', { class: 'test-card' }, (item as StackItem).text),
    },
  })
}

function cardTexts(wrapper: ReturnType<typeof mountStack>) {
  return wrapper.findAll('.test-card').map((card) => card.text())
}

describe('CardStack 卡片堆', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('按渲染顺序层叠，末位为顶牌', () => {
    const wrapper = mountStack()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])
    expect(wrapper.attributes('role')).toBe('group')
  })

  it('sendToBackOnClick 时点击顶牌送底轮换', async () => {
    const wrapper = mountStack({ sendToBackOnClick: true })
    const topCard = wrapper.get('[role="button"]')
    await topCard.trigger('click')
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
  })

  it('未开启点击轮换时点击不改变顺序', async () => {
    const wrapper = mountStack()
    expect(wrapper.find('[role="button"]').exists()).toBe(false)
    const wrappers = wrapper.findAll('.inset-0')
    await wrappers[wrappers.length - 1]?.trigger('click')
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])
  })

  it('autoplay 按间隔把顶牌送底', async () => {
    vi.useFakeTimers()
    const wrapper = mountStack({ autoplay: true, autoplayDelay: 1000 })
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第二条', '第三条', '第一条'])
  })

  it('pauseOnHover 悬停期间暂停轮换', async () => {
    vi.useFakeTimers()
    const wrapper = mountStack({ autoplay: true, autoplayDelay: 1000, pauseOnHover: true })
    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(2500)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])
    await wrapper.trigger('mouseleave')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
  })

  it('送底阈值按卡宽比例：不足则回弹不换牌，超过即送底', async () => {
    const wrapper = mountStack()
    const stacks = wrapper.findAll('.inset-0')
    const top = stacks[stacks.length - 1]!.element as HTMLElement
    stubClientWidth(top, 400) // 阈值 = clamp(400 × 0.18 = 72, 48, 200) = 72px
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1300)
    fire(top, 'pointermove', 260, 200) // 慢拖 60px / 300ms，不足 72px
    fire(top, 'pointerup', 260, 200)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1600)
    fire(top, 'pointermove', 290, 200) // 慢拖 90px / 300ms，超过 72px
    fire(top, 'pointerup', 290, 200)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
    now.mockRestore()
  })

  it('轻甩即换：位移不足阈值但甩得够快也送底', async () => {
    const wrapper = mountStack()
    const stacks = wrapper.findAll('.inset-0')
    const top = stacks[stacks.length - 1]!.element as HTMLElement
    stubClientWidth(top, 400) // 阈值 72px
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1005)
    fire(top, 'pointermove', 230, 200) // 30px / 5ms → vx = 1.2px/ms，远超 0.35
    now.mockReturnValue(1010)
    fire(top, 'pointerup', 230, 200) // dx = 30，远不足 72px
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
    now.mockRestore()
  })

  it('慢拖同样距离不换牌（速度判据不误判慢速拖动）', async () => {
    const wrapper = mountStack()
    const stacks = wrapper.findAll('.inset-0')
    const top = stacks[stacks.length - 1]!.element as HTMLElement
    stubClientWidth(top, 400) // 阈值 72px
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1300)
    fire(top, 'pointermove', 230, 200) // 30px / 300ms → vx = 0.02px/ms
    now.mockReturnValue(1300)
    fire(top, 'pointerup', 230, 200)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])
    now.mockRestore()
  })

  it('卡宽不可读时阈值退化为下限，轻碰不换牌', async () => {
    const wrapper = mountStack()
    const stacks = wrapper.findAll('.inset-0')
    const top = stacks[stacks.length - 1]!.element as HTMLElement
    stubClientWidth(top, 0) // 阈值 = clamp(0, 48, 200) = 48px
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1300)
    fire(top, 'pointermove', 230, 200) // 30px 慢拖，不足 48px 下限
    fire(top, 'pointerup', 230, 200)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])

    fire(top, 'pointerdown', 200, 200)
    now.mockReturnValue(1600)
    fire(top, 'pointermove', 260, 200) // 60px > 48px
    fire(top, 'pointerup', 260, 200)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第三条', '第一条', '第二条'])
    now.mockRestore()
  })

  it('3D 倾斜随送底进度线性映射，拖到阈值处达上限', () => {
    const wrapper = mountStack()
    const stacks = wrapper.findAll('.inset-0')
    const top = stacks[stacks.length - 1]!.element as HTMLElement
    stubClientWidth(top, 400) // 阈值 72px

    fire(top, 'pointerdown', 200, 200)
    fire(top, 'pointermove', 236, 200) // dx = 36 = 阈值的一半 → 倾斜 30°（上限 60°）
    expect(top.style.transform).toContain('rotateY(30deg)')
    fire(top, 'pointerup', 236, 200)
  })

  it('prefers-reduced-motion 下不自动轮换', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    )
    vi.useFakeTimers()
    const wrapper = mountStack({ autoplay: true, autoplayDelay: 1000 })
    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(cardTexts(wrapper)).toEqual(['第一条', '第二条', '第三条'])
  })
})
