// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { loadContent } from '../src/data'
import FormulaDetailView from '../src/ui/views/FormulaDetailView.vue'
import ClauseDetailView from '../src/ui/views/ClauseDetailView.vue'
import StatCard from '../src/ui/components/StatCard.vue'
import StatsView from '../src/ui/views/StatsView.vue'

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
  getAllDailyLogs: vi.fn(),
  getClauseStates: vi.fn(),
  getFavorites: vi.fn(),
  getQuizLogs: vi.fn(),
  getReviewLogs: vi.fn(),
  isFavorite: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))
vi.mock('../src/store', () => ({
  getAllCards: storeMocks.getAllCards,
  getAllDailyLogs: storeMocks.getAllDailyLogs,
  getClauseStates: storeMocks.getClauseStates,
  getFavorites: storeMocks.getFavorites,
  getQuizLogs: storeMocks.getQuizLogs,
  getReviewLogs: storeMocks.getReviewLogs,
  isFavorite: storeMocks.isFavorite,
  addFavorite: storeMocks.addFavorite,
  removeFavorite: storeMocks.removeFavorite,
}))

describe('ui 统计页专项', () => {
  beforeEach(async () => {
    // 预加载内容缓存：动态 import 不受 flushPromises 控制，先预热再挂载
    await loadContent()

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 17, 12, 0, 0))

    storeMocks.getAllCards.mockResolvedValue([])
    storeMocks.getClauseStates.mockResolvedValue([])
    storeMocks.getAllDailyLogs.mockResolvedValue([
      { date: '2026-08-17', requiredCount: 1, completedCount: 1 },
      { date: '2026-08-16', requiredCount: 1, completedCount: 1 },
    ])
    storeMocks.getQuizLogs.mockResolvedValue([])
    storeMocks.getReviewLogs.mockResolvedValue([])
    storeMocks.getFavorites.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染连续打卡与全部统计指标', async () => {
    const wrapper = mount(StatsView)
    await flushPromises()
    // 内容按篇懒加载后，动态 import 需要多一轮事件循环
    await flushPromises()
    await flushPromises()

    const labels = [
      '连续打卡',
      '累计学习',
      '学习日历',
      '已掌握',
      '学习中',
      '待复习',
      '已收藏',
      '正确率',
      '记忆保持率',
      '篇章进度',
      '记忆保持率趋势',
    ]
    for (const label of labels) {
      expect(wrapper.text()).toContain(label)
    }

    const streakCard = wrapper.findAllComponents(StatCard)[0]
    expect(streakCard.props('value')).toBe(2)
    expect(streakCard.props('unit')).toBe('天')
  })
})

describe('ui 方剂详情页专项', () => {
  beforeEach(() => {
    vi.useRealTimers()
    routerMocks.routeParams = { id: 'SHL.SB.F.001' }
    storeMocks.isFavorite.mockResolvedValue(false)
    storeMocks.addFavorite.mockResolvedValue(undefined)
    storeMocks.removeFavorite.mockResolvedValue(undefined)
  })

  it('渲染组成、剂量换算警告、安全提示与相关条文', async () => {
    const wrapper = mount(FormulaDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('桂枝汤')
    expect(wrapper.text()).toContain('桂枝')
    expect(wrapper.text()).toContain('组成')
    expect(wrapper.text()).toContain('学术探讨，非用药指导')
    expect(wrapper.text()).toContain('仅供学习研究，不构成医疗建议，请勿自行用药。')
    expect(wrapper.text()).toContain('煎服法')
    expect(wrapper.text()).toContain('相关条文')
    expect(wrapper.text()).toContain('类方关系')
    expect(wrapper.find('a[href="/clauses/SHL.SB.TYS.012"]').exists()).toBe(true)
  })

  it('条文详情页提供预填当前条文的纠错入口', async () => {
    routerMocks.routeParams = { id: 'SHL.SB.TYS.001' }
    routerMocks.fullPath = '/clauses/SHL.SB.TYS.001'
    storeMocks.isFavorite.mockResolvedValue(false)

    const wrapper = mount(ClauseDetailView, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })
    await flushPromises()

    const link = wrapper.find('a[href*="/feedback"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('纠错')
    expect(link.attributes('href')).toContain('type=clause')
    expect(link.attributes('href')).toContain('location=')
  })
})
