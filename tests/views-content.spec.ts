// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { flushPromises, mount } from '@vue/test-utils'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import FormulaDetailView from '../src/ui/views/FormulaDetailView.vue'
import StatCard from '../src/ui/components/StatCard.vue'
import StatsView from '../src/ui/views/StatsView.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

const routerMocks = vi.hoisted(() => ({
  routeParams: {} as Record<string, string>,
  push: vi.fn(),
  back: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
    back: routerMocks.back,
    options: { history: { state: { back: null } } },
  }),
  useRoute: () => ({ params: routerMocks.routeParams }),
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
  beforeEach(() => {
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
})
