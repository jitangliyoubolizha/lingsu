// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import FavoritesView from '../src/ui/views/FavoritesView.vue'

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
  loadContent: vi.fn(),
  loadMeta: vi.fn(),
  getFavorites: vi.fn(),
  removeFavorite: vi.fn(),
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
  loadContent: mocks.loadContent,
  loadMeta: mocks.loadMeta,
}))
vi.mock('../src/store', () => ({
  getFavorites: mocks.getFavorites,
  removeFavorite: mocks.removeFavorite,
}))

const clause = { id: 'SHL.SB.TYS.001', no: 1, text: '太阳之为病，脉浮，恶寒。' }
const formula = { id: 'SHL.SB.F.001', name: '桂枝汤' }
const herb = { id: 'SHL.SB.H.001', name: '桂枝' }

function favorite(type: 'clause' | 'formula' | 'herb', targetId: string) {
  return { id: `${type}:${targetId}`, type, targetId, createdAt: new Date('2026-08-24T00:00:00Z') }
}

describe('FavoritesView 收藏页', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadContent.mockResolvedValue({ clauses: [clause] })
    mocks.loadMeta.mockReturnValue({ formulas: [formula], herbs: [herb] })
    mocks.getFavorites.mockResolvedValue([])
    mocks.removeFavorite.mockResolvedValue(undefined)
  })

  function mountView() {
    return mount(FavoritesView, { global: { stubs: { RouterLink: RouterLinkStub } } })
  }

  it('分组展示条文、方剂、药物收藏', async () => {
    mocks.getFavorites.mockResolvedValue([
      favorite('clause', 'SHL.SB.TYS.001'),
      favorite('formula', 'SHL.SB.F.001'),
      favorite('herb', 'SHL.SB.H.001'),
    ])

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('条文')
    expect(wrapper.text()).toContain('第 1 条')
    expect(wrapper.text()).toContain('太阳之为病，脉浮，恶寒。')
    expect(wrapper.text()).toContain('方剂')
    expect(wrapper.text()).toContain('桂枝汤')
    expect(wrapper.text()).toContain('药物')
    expect(wrapper.text()).toContain('桂枝')

    expect(wrapper.find('a[href="/clauses/SHL.SB.TYS.001"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/formulas/SHL.SB.F.001"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/herbs/SHL.SB.H.001"]').exists()).toBe(true)
  })

  it('无收藏时显示空状态', async () => {
    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('暂无收藏')
  })

  it('点击取消收藏触发 removeFavorite 并刷新', async () => {
    mocks.getFavorites.mockResolvedValue([favorite('clause', 'SHL.SB.TYS.001')])

    const wrapper = mountView()
    await flushPromises()
    await flushPromises()

    const unfavoriteButton = wrapper.find('button[aria-label="取消收藏"]')
    await unfavoriteButton.trigger('click')
    await flushPromises()

    expect(mocks.removeFavorite).toHaveBeenCalledWith('clause', 'SHL.SB.TYS.001')
    expect(mocks.getFavorites).toHaveBeenCalledTimes(2)
  })
})
