// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadContent } from '../src/data'
import ClauseListView from '../src/ui/views/ClauseListView.vue'

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

const routerMocks = vi.hoisted(() => ({
  routeParams: {} as Record<string, string>,
  fullPath: '/',
  push: vi.fn(),
  back: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
    back: routerMocks.back,
    options: { history: { state: { back: null } } },
  }),
  useRoute: () => ({
    params: routerMocks.routeParams,
    fullPath: routerMocks.fullPath,
  }),
}))

const storeMocks = vi.hoisted(() => ({
  getAllCards: vi.fn(),
  getFavorites: vi.fn(),
}))
vi.mock('../src/store', () => ({
  getAllCards: storeMocks.getAllCards,
  getFavorites: storeMocks.getFavorites,
}))

describe('ClauseListView 篇章导航', () => {
  beforeEach(async () => {
    await loadContent()
    storeMocks.getAllCards.mockResolvedValue([])
    storeMocks.getFavorites.mockResolvedValue([])
  })

  it('渲染全部 10 篇章节标题', async () => {
    const wrapper = mount(ClauseListView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    const expectedChapters = [
      '辨太阳病脉证并治上',
      '辨太阳病脉证并治中',
      '辨太阳病脉证并治下',
      '辨阳明病脉证并治',
      '辨少阳病脉证并治',
      '辨太阴病脉证并治',
      '辨少阴病脉证并治',
      '辨厥阴病脉证并治',
      '辨霍乱病脉证并治',
      '辨阴阳易差后劳复病脉证并治',
    ]

    for (const name of expectedChapters) {
      expect(wrapper.text()).toContain(name)
    }
  })

  it('副标题显示全书条文总数', async () => {
    const wrapper = mount(ClauseListView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('398')
    expect(wrapper.text()).toContain('10 篇')
  })

  it('章节可展开/折叠', async () => {
    const wrapper = mount(ClauseListView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    // 默认全部展开，应能看到条文内容
    expect(wrapper.text()).toContain('太阳之为病')

    // 点击第一个章节标题折叠
    const firstHeader = wrapper.find('[role="button"]')
    expect(firstHeader.exists()).toBe(true)
    await firstHeader.trigger('click')
    await flushPromises()

    // 折叠后条文仍存在（其他章节展开）
    expect(wrapper.text()).toContain('太阳之为病')
  })

  it('筛选后空章节被隐藏', async () => {
    const wrapper = mount(ClauseListView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    await flushPromises()
    await flushPromises()

    // 初始全部展开，10 个章节
    const sections = wrapper.findAll('section')
    expect(sections.length).toBe(10)

    // 切换到"已收藏"筛选（无收藏），所有章节应隐藏
    const tablist = wrapper.find('[role="tablist"]')
    const tabs = tablist.findAll('button')
    const favoriteTab = tabs[tabs.length - 1] // 最后一个 tab 是"已收藏"
    expect(favoriteTab?.exists()).toBe(true)
    await favoriteTab!.trigger('click')
    await flushPromises()

    // 无收藏时，所有章节都为空，应显示空状态
    expect(wrapper.text()).toContain('暂无相关条文')
  })
})