// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import HerbDetailView from '../src/ui/views/HerbDetailView.vue'
import HerbListView from '../src/ui/views/HerbListView.vue'

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
  loadMeta: vi.fn(),
  loadAllFormulas: vi.fn(),
  getHerbFormulaIds: vi.fn(),
  isFavorite: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ params: routeParams.value, fullPath: '/herbs' }),
  RouterLink: { props: ['to'], template: '<a><slot /></a>' },
}))
const routeParams = vi.hoisted(() => ({ value: {} as Record<string, string> }))

vi.mock('../src/data', () => ({
  loadMeta: mocks.loadMeta,
  loadAllFormulas: mocks.loadAllFormulas,
}))
vi.mock('../src/domain', () => ({
  getHerbFormulaIds: mocks.getHerbFormulaIds,
}))
vi.mock('../src/store', () => ({
  isFavorite: mocks.isFavorite,
  addFavorite: mocks.addFavorite,
  removeFavorite: mocks.removeFavorite,
}))

const herbs = [
  {
    id: 'SHL.SB.H.001',
    name: '桂枝',
    aliases: ['桂'],
    category: '解表药',
    nature: '辛、甘，温',
    meridians: ['心', '肺', '膀胱'],
    effects: '发汗解肌，温通经脉，助阳化气，平冲降气',
    applications: '经方中应用最广的一味药。',
    dosage: '3~10g',
    cautions: '辛温助热，易伤阴动血。',
  },
  {
    id: 'SHL.SB.H.010',
    name: '麻黄',
    aliases: [],
    category: '解表药',
    nature: '辛、微苦，温',
    meridians: ['肺', '膀胱'],
    effects: '发汗解表，宣肺平喘，利水消肿',
    applications: '发汗解表、宣肺平喘之要药。',
    dosage: '2~10g',
    cautions: '发汗力强，表虚自汗者慎用。',
  },
  {
    id: 'SHL.SB.H.015',
    name: '茯苓',
    aliases: [],
    category: '利水渗湿药',
    nature: '甘、淡，平',
    meridians: ['心', '脾', '肾'],
    effects: '利水消肿，渗湿，健脾，宁心',
    applications: '经方利水第一要药。',
    dosage: '9~15g',
    cautions: '虚寒精滑者忌服。',
  },
]

describe('HerbListView 中药列表页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeParams.value = {}
    mocks.loadMeta.mockReturnValue({ herbs })
  })

  function mountView() {
    return mount(HerbListView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  }

  it('按功效分类分组展示药物', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('解表药')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('利水渗湿药')
    expect(wrapper.text()).toContain('桂枝')
    expect(wrapper.text()).toContain('辛、甘，温')
    expect(wrapper.find('a[href="/herbs/SHL.SB.H.001"]').exists()).toBe(true)
  })

  it('按药名与别名关键词过滤', async () => {
    const wrapper = mountView()
    await flushPromises()

    const input = wrapper.find('input')
    await input.setValue('麻')
    await flushPromises()
    expect(wrapper.text()).toContain('麻黄')
    expect(wrapper.text()).not.toContain('桂枝')

    await input.setValue('桂')
    await flushPromises()
    expect(wrapper.text()).toContain('桂枝')
    expect(wrapper.text()).not.toContain('麻黄')

    await input.setValue('不存在的药')
    await flushPromises()
    expect(wrapper.text()).toContain('未找到相关药物')
  })
})

describe('HerbDetailView 药物详情页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeParams.value = { id: 'SHL.SB.H.001' }
    mocks.loadMeta.mockReturnValue({ herbs })
    mocks.loadAllFormulas.mockResolvedValue([])
    mocks.getHerbFormulaIds.mockReturnValue(['SHL.SB.F.001'])
    mocks.isFavorite.mockResolvedValue(false)
    mocks.addFavorite.mockResolvedValue(undefined)
    mocks.removeFavorite.mockResolvedValue(undefined)
  })

  function mountView() {
    return mount(HerbDetailView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  }

  it('渲染本草卡字段与经方应用', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('桂枝')
    expect(wrapper.text()).toContain('解表药')
    expect(wrapper.text()).toContain('本草卡')
    expect(wrapper.text()).toContain('性味')
    expect(wrapper.text()).toContain('归经')
    expect(wrapper.text()).toContain('心、肺、膀胱')
    expect(wrapper.text()).toContain('用量参考')
    expect(wrapper.text()).toContain('3~10g（仅供参考）')
    expect(wrapper.text()).toContain('使用注意：辛温助热，易伤阴动血。')
    expect(wrapper.text()).toContain('经方应用')
    expect(wrapper.text()).toContain('仅供学习研究，不构成医疗建议，请勿自行用药。')
  })

  it('出现方剂反查与收藏切换', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('a[href="/formulas/SHL.SB.F.001"]').exists()).toBe(true)

    const starButton = wrapper.find('button[aria-label="收藏药物"]')
    expect(starButton.exists()).toBe(true)
    await starButton.trigger('click')
    await flushPromises()
    expect(mocks.addFavorite).toHaveBeenCalledWith('herb', 'SHL.SB.H.001')

    const unfavoriteButton = wrapper.find('button[aria-label="取消收藏"]')
    await unfavoriteButton.trigger('click')
    await flushPromises()
    expect(mocks.removeFavorite).toHaveBeenCalledWith('herb', 'SHL.SB.H.001')
  })
})
