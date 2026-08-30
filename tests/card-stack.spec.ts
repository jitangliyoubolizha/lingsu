// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'

import { afterEach, describe, expect, it, vi } from 'vitest'

import CardStack from '../src/ui/components/CardStack.vue'

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
