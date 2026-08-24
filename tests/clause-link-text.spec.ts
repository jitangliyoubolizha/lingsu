// @vitest-environment jsdom
import { mount } from '@vue/test-utils'

import { describe, expect, it } from 'vitest'

import ClauseLinkText from '../src/ui/components/ClauseLinkText.vue'

const RouterLinkStub = {
  props: ['to'],
  methods: {
    href(to: string | { path?: string; query?: Record<string, string> }) {
      if (typeof to === 'string') return to
      const query = new URLSearchParams(to.query ?? {}).toString()
      return query ? `${to.path ?? ''}?${query}` : (to.path ?? '')
    },
  },
  template: '<a :href="href(to)"><slot /></a>',
}

// 模拟全书条文顺序：index 0 → 第 1 条，以此类推
const clauseOrder = Array.from({ length: 398 }, (_, index) =>
  `SHL.SB.TYS.${String(index + 1).padStart(3, '0')}`
)

function mountText(text: string) {
  return mount(ClauseLinkText, {
    props: { text, clauseOrder },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('ClauseLinkText 条文互链', () => {
  it('识别阿拉伯数字「第 N 条」并渲染为链接', () => {
    const wrapper = mountText('此承第 12 条而言。')
    const link = wrapper.find('a[href="/clauses/SHL.SB.TYS.012"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('第 12 条')
    expect(wrapper.text()).toBe('此承第 12 条而言。')
  })

  it('识别中文数字「第十二条」并渲染为链接', () => {
    const wrapper = mountText('详见第十二条。')
    const link = wrapper.find('a[href="/clauses/SHL.SB.TYS.012"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('第十二条')
  })

  it('百位条文号映射正确', () => {
    const wrapper = mountText('见第 179 条。')
    const link = wrapper.find('a[href="/clauses/SHL.SB.TYS.179"]')
    expect(link.exists()).toBe(true)
  })

  it('无引用时渲染纯文本，不产生链接', () => {
    const wrapper = mountText('太阳之为病，脉浮，恶寒。')
    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).toBe('太阳之为病，脉浮，恶寒。')
  })

  it('超出全书范围的条文号不渲染链接', () => {
    const wrapper = mountText('见第 500 条。')
    expect(wrapper.findAll('a')).toHaveLength(0)
    expect(wrapper.text()).toBe('见第 500 条。')
  })
})
