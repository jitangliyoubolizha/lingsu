// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentData } from '../src/data/types'

/* ---- 引擎依赖桩：ctx 代理（参考 ForceGraph.spec）+ 惰性 rAF ---- */
function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string, unknown> = {}
  return new Proxy(target, {
    get(t, key) {
      if (!(key in t)) t[key as string] = vi.fn()
      return t[key as string]
    },
    set(t, key, value) {
      t[key as string] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0))
vi.stubGlobal('cancelAnimationFrame', vi.fn())
window.requestAnimationFrame = vi.fn(() => 0)
window.cancelAnimationFrame = vi.fn()
// 用 defineProperty 规避 getContext 重载签名的严格类型不匹配（CI 的 vue-tsc -b 会查到这里）
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => makeCtx(),
})

/* ---- 固定内容数据：3 方剂 + 4 入图中药 (+1 孤儿中药不入图) ---- */
const contentFixture: ContentData = {
  book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
  edition: { code: 'SB', book: 'SHL', name: '宋本', source: 'test', chapters: [] },
  chapters: [],
  clauses: [],
  formulas: [
    {
      id: 'F1',
      name: '甲汤',
      category: '解表',
      composition: [
        { herb: 'H1' },
        { herb: 'H2' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: [],
      relatedFormulas: [],
      safetyNotice: '',
      mainSymptoms: ['SYM1'],
      pulse: [],
      pathomechanism: '',
    },
    {
      id: 'F2',
      name: '乙汤',
      category: '解表',
      composition: [
        { herb: 'H1' },
        { herb: 'H2' },
        { herb: 'H3' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: [],
      relatedFormulas: [],
      safetyNotice: '',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
    {
      id: 'F3',
      name: '丙汤',
      category: '泻下',
      composition: [
        { herb: 'H3' },
        { herb: 'H4' },
      ],
      originalDoseText: '',
      doseReference: '',
      decoction: '',
      relatedClauses: [],
      relatedFormulas: [],
      safetyNotice: '',
      mainSymptoms: [],
      pulse: [],
      pathomechanism: '',
    },
  ],
  herbs: [
    { id: 'H1', name: '药一', aliases: [] },
    { id: 'H2', name: '药二', aliases: [] },
    { id: 'H3', name: '药三', aliases: [] },
    { id: 'H4', name: '药四', aliases: [] },
    { id: 'H5', name: '孤儿药', aliases: [] },
  ],
  symptomTerms: [{ id: 'SYM1', name: '发热', category: '症状', aliases: ['身热'] }],
  questions: [],
}

/* 基线全图：节点 = 3 方剂 + 4 被引用中药 = 7；边 = 7 compose + 1 药对(H1|H2) = 8。
 * F1 邻居子图：节点 = F1+H1+H2 = 3；边 = 2 compose + 邻居间药对 = 3。 */

const routerMocks = vi.hoisted(() => ({
  query: {} as Record<string, string>,
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
  useRoute: () => ({
    params: {},
    fullPath: '/graph',
    query: routerMocks.query,
  }),
}))

vi.mock('../src/data', () => ({
  loadContent: vi.fn(async () => contentFixture),
}))

import GraphView from '../src/ui/views/GraphView.vue'

const RouterLinkStub = {
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : to.path"><slot /></a>',
}

function mountGraph() {
  return mount(GraphView, {
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

function statusText(wrapper: ReturnType<typeof mountGraph>): string {
  return wrapper.find('[role="status"]').text()
}

describe('GraphView 只看邻居', () => {
  beforeEach(() => {
    routerMocks.query = {}
  })

  it('初始渲染全图节点/关系计数', async () => {
    const wrapper = mountGraph()
    await flushPromises()
    await flushPromises()

    expect(statusText(wrapper)).toContain('7')
    expect(statusText(wrapper)).toContain('8')
  })

  it('选中节点后点击「只看邻居」，画布切换为邻居子图并保持面板', async () => {
    // 通过深链直接定位 F1，免去模拟 canvas 点击
    routerMocks.query = { focus: 'f:F1' }
    const wrapper = mountGraph()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('甲汤') // 信息面板出现

    const toggle = wrapper
      .findAll('button')
      .find((b) => b.text().includes('只看邻居'))
    expect(toggle).toBeTruthy()

    await toggle!.trigger('click')
    await flushPromises()
    await flushPromises()

    // 子图：3 节点 / 3 边 —— 此前缺陷是按钮不产生任何效果
    expect(statusText(wrapper)).toContain('3')
    expect(wrapper.text()).toContain('返回全图') // 按钮态已翻转
    expect(wrapper.text()).toContain('甲汤') // 焦点仍在
  })

  it('再点「返回全图」恢复完整图与选中焦点', async () => {
    routerMocks.query = { focus: 'f:F1' }
    const wrapper = mountGraph()
    await flushPromises()
    await flushPromises()

    const enter = wrapper.findAll('button').find((b) => b.text().includes('只看邻居'))!
    await enter.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(statusText(wrapper)).toContain('3')

    const exit = wrapper.findAll('button').find((b) => b.text().includes('返回全图'))!
    await exit.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(statusText(wrapper)).toContain('7')
    expect(statusText(wrapper)).toContain('8')
    expect(wrapper.text()).toContain('甲汤')
  })

  it('开启「显示症状节点」后计入症状节点与主症边（7→8 节点 / 8→9 关系）', async () => {
    const wrapper = mountGraph()
    await flushPromises()
    await flushPromises()

    const symptomToggle = wrapper.find('input[aria-label="显示症状节点"]')
    expect(symptomToggle).toBeTruthy()
    await symptomToggle.setValue(true)
    await flushPromises()
    await flushPromises()

    expect(statusText(wrapper)).toContain('8')
    expect(statusText(wrapper)).toContain('9')
    expect(wrapper.text()).toContain('症状')
  })

  it('选中方剂时信息面板提供「刷相关题」闭环链接', async () => {
    routerMocks.query = { focus: 'f:F1' }
    const wrapper = mountGraph()
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('甲汤')
    const quizLink = wrapper.findAll('a').find((a) => a.attributes('href')?.includes('/quiz'))
    expect(quizLink).toBeTruthy()
    expect(quizLink!.attributes('href')).toContain('formula=F1')
    expect(quizLink!.text()).toContain('刷相关题')
  })
})
