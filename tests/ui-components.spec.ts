// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import AgreementView from '../src/ui/views/AgreementView.vue'
import HighlightText from '../src/ui/components/HighlightText.vue'
import ProgressBar from '../src/ui/components/ProgressBar.vue'
import SearchBar from '../src/ui/components/SearchBar.vue'
import StatCard from '../src/ui/components/StatCard.vue'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('../src/store', () => ({
  markAgreed: vi.fn().mockResolvedValue(undefined),
}))

describe('ui 基础组件', () => {
  it('HighlightText 高亮命中的关键词', () => {
    const wrapper = mount(HighlightText, {
      props: { text: '太阳病，恶寒。', keyword: '恶寒' },
    })
    const marks = wrapper.findAll('mark')
    expect(marks.some((mark) => mark.classes().includes('text-cinnabar'))).toBe(true)
    expect(wrapper.text()).toContain('恶寒')
  })

  it('HighlightText 空关键词不高亮', () => {
    const wrapper = mount(HighlightText, {
      props: { text: '太阳病', keyword: '' },
    })
    const marks = wrapper.findAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].classes().includes('text-cinnabar')).toBe(false)
  })

  it('SearchBar 提交查询并发出 submit 与 model 更新', async () => {
    const wrapper = mount(SearchBar)
    const input = wrapper.get('input')
    await input.setValue('桂枝')
    await wrapper.get('form').trigger('submit')
    const submitted = wrapper.emitted('submit')
    expect(submitted).toBeTruthy()
    expect(submitted?.[0]).toEqual(['桂枝'])
  })

  it('SearchBar 清空按钮发出 clear 事件', async () => {
    const wrapper = mount(SearchBar)
    await wrapper.get('input').setValue('桂枝')
    const clear = wrapper.find('button[aria-label="清空搜索"]')
    expect(clear.exists()).toBe(true)
    await clear.trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('')
  })

  it('StatCard 渲染数值、单位与标签，cinnabar 高亮色', () => {
    const wrapper = mount(StatCard, {
      props: { label: '连续打卡', value: 12, unit: '天', tone: 'cinnabar' },
    })
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('天')
    expect(wrapper.text()).toContain('连续打卡')
    expect(wrapper.find('p').classes()).toContain('text-cinnabar')
  })

  it('ProgressBar 数值限制在 0-100 并反映到 ARIA 与宽度', () => {
    const clamped = mount(ProgressBar, { props: { value: 150 } })
    expect(clamped.attributes('aria-valuenow')).toBe('100')
    const style = clamped.find('div[style]').attributes('style')
    expect(style).toContain('100%')

    const clampedLow = mount(ProgressBar, { props: { value: -5 } })
    expect(clampedLow.attributes('aria-valuenow')).toBe('0')
  })
})

describe('ui 协议流程', () => {
  beforeEach(() => {
    mocks.push.mockReset()
  })

  it('未勾选时按钮禁用，勾选后点击进入首页', async () => {
    const wrapper = mount(AgreementView)
    const button = wrapper.get('button')
    expect(button.attributes('disabled')).toBeDefined()

    const checkbox = wrapper.get('input[type="checkbox"]')
    await checkbox.setValue(true)
    await button.trigger('click')
    await flushPromises()

    expect(mocks.push).toHaveBeenCalledWith('/')
  })
})
