// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileView from '../src/ui/views/ProfileView.vue'

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

const mocks = vi.hoisted(() => ({
  chapters: [
    { code: 'TYS', name: '辨太阳病脉证并治上', order: 1, clauseCount: 30 },
    { code: 'YM', name: '辨阳明病脉证并治', order: 4, clauseCount: 84 },
  ],
  createStudyPlan: vi.fn(),
  deleteStudyPlan: vi.fn(),
  exportData: vi.fn(),
  getActivePlanCount: vi.fn(),
  getClauseStates: vi.fn(),
  getAllStudyPlans: vi.fn(),
  getSetting: vi.fn(),
  importData: vi.fn(),
  serializeBackup: vi.fn(),
  setSetting: vi.fn(),
  togglePlanStatus: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
  useRoute: () => ({ params: {}, fullPath: '/' }),
}))
vi.mock('../src/data', () => ({
  loadMeta: () => ({ chapters: mocks.chapters }),
}))
vi.mock('../src/store', () => ({
  createStudyPlan: mocks.createStudyPlan,
  deleteStudyPlan: mocks.deleteStudyPlan,
  exportData: mocks.exportData,
  getActivePlanCount: mocks.getActivePlanCount,
  getClauseStates: mocks.getClauseStates,
  getAllStudyPlans: mocks.getAllStudyPlans,
  getSetting: mocks.getSetting,
  importData: mocks.importData,
  serializeBackup: mocks.serializeBackup,
  setSetting: mocks.setSetting,
  togglePlanStatus: mocks.togglePlanStatus,
  MAX_ACTIVE_PLANS: 2,
}))

function makePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: '太阳病上篇 30 天计划',
    scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
    dailyNew: 3,
    startDate: '2026-08-01',
    status: 'active',
    ...overrides,
  }
}

describe('ProfileView 学习计划管理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClauseStates.mockResolvedValue([])
    mocks.getSetting.mockImplementation(
      (_key: string, fallback: unknown) => Promise.resolve(fallback)
    )
    mocks.serializeBackup.mockReturnValue('{}')
    mocks.getAllStudyPlans.mockResolvedValue([])
    mocks.getActivePlanCount.mockResolvedValue(0)
    mocks.togglePlanStatus.mockResolvedValue(true)
    mocks.deleteStudyPlan.mockResolvedValue(undefined)
  })

  function mountView() {
    return mount(ProfileView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  }

  it('渲染计划列表、状态标签与每日新学数量', async () => {
    mocks.getAllStudyPlans.mockResolvedValue([
      makePlan({ id: 'p1', name: '太阳病上篇 30 天计划', status: 'active', dailyNew: 3 }),
      makePlan({ id: 'p2', name: '阳明病计划', status: 'paused', dailyNew: 5 }),
    ])
    mocks.getActivePlanCount.mockResolvedValue(1)

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('太阳病上篇 30 天计划')
    expect(wrapper.text()).toContain('阳明病计划')
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('已暂停')
    expect(wrapper.text()).toContain('3 条/日')
    expect(wrapper.text()).toContain('5 条/日')
  })

  it('点击暂停触发 togglePlanStatus 并刷新列表', async () => {
    mocks.getAllStudyPlans.mockResolvedValue([makePlan({ id: 'p1', status: 'active' })])
    mocks.getActivePlanCount.mockResolvedValue(1)

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const pauseButton = wrapper.findAll('button').find((button) => button.text().includes('暂停'))
    await pauseButton!.trigger('click')
    await flushPromises()

    expect(mocks.togglePlanStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    expect(mocks.getAllStudyPlans).toHaveBeenCalledTimes(2)
  })

  it('点击删除触发 deleteStudyPlan', async () => {
    mocks.getAllStudyPlans.mockResolvedValue([makePlan({ id: 'p1' })])
    mocks.getActivePlanCount.mockResolvedValue(1)

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const deleteButton = wrapper.findAll('button').find((button) => button.text().includes('删除'))
    await deleteButton!.trigger('click')
    await flushPromises()

    expect(mocks.deleteStudyPlan).toHaveBeenCalledWith('p1')
  })

  it('新增计划：展开表单、选篇章与数量后提交', async () => {
    mocks.getAllStudyPlans.mockResolvedValue([])
    mocks.getActivePlanCount.mockResolvedValue(0)
    mocks.createStudyPlan.mockResolvedValue(makePlan({ id: 'p-new', name: '辨阳明病脉证并治' }))

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const addButton = wrapper.findAll('button').find((button) => button.text().includes('新增计划'))
    expect(addButton).toBeTruthy()
    await addButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('新增学习计划')

    const select = wrapper.find('#new-plan-chapter')
    await select.setValue('YM')

    const fiveButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === '5 条/日')
    await fiveButton!.trigger('click')

    const submit = wrapper.findAll('button').find((button) => button.text().includes('创建计划'))
    await submit!.trigger('click')
    await flushPromises()

    expect(mocks.createStudyPlan).toHaveBeenCalledWith({
      name: '辨阳明病脉证并治',
      scope: { book: 'SHL', edition: 'SB', chapters: ['YM'] },
      dailyNew: 5,
    })
  })

  it('已有两个 active 计划时不显示新增入口', async () => {
    mocks.getAllStudyPlans.mockResolvedValue([makePlan({ id: 'p1' }), makePlan({ id: 'p2' })])
    mocks.getActivePlanCount.mockResolvedValue(2)

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('最多同时进行 2 个计划')
    const addButton = wrapper.findAll('button').find((button) => button.text().includes('新增计划'))
    expect(addButton).toBeFalsy()
  })
})
