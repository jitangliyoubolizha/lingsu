// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryCard, ReviewLog } from '../src/domain/memory'
import StudyTaskView from '../src/ui/views/StudyTaskView.vue'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  loadContent: vi.fn(),
  buildQuizDeck: vi.fn(),
  getTodayQueue: vi.fn(),
  createCard: vi.fn(),
  reviewCard: vi.fn(),
  ensureDefaultStudyPlan: vi.fn().mockResolvedValue(undefined),
  getActiveStudyPlans: vi.fn().mockResolvedValue([]),
  getAllCards: vi.fn().mockResolvedValue([]),
  getClauseStates: vi.fn().mockResolvedValue([]),
  getDailyLog: vi.fn().mockResolvedValue(undefined),
  getDueWrongQuestions: vi.fn().mockResolvedValue([]),
  getSetting: vi.fn().mockResolvedValue(undefined),
  setSetting: vi.fn().mockResolvedValue(undefined),
  updateActivePlansDailyNew: vi.fn().mockResolvedValue(undefined),
  applyDailyNew: vi.fn().mockResolvedValue(8),
  addQuizLog: vi.fn().mockResolvedValue(1),
  addWrongQuestion: vi.fn().mockResolvedValue(undefined),
  markWrongCorrect: vi.fn().mockResolvedValue(undefined),
  markClauseLearned: vi.fn().mockResolvedValue(undefined),
  saveCard: vi.fn().mockResolvedValue(undefined),
  saveDailyLog: vi.fn().mockResolvedValue(undefined),
  saveReviewLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => ({ query: {}, fullPath: '/study' }),
}))
vi.mock('../src/data', () => ({
  loadContent: mocks.loadContent,
}))
vi.mock('../src/domain', () => ({
  buildQuizDeck: mocks.buildQuizDeck,
  createCard: mocks.createCard,
  getTodayQueue: mocks.getTodayQueue,
  reviewCard: mocks.reviewCard,
}))
vi.mock('../src/store', () => ({
  addQuizLog: mocks.addQuizLog,
  applyDailyNew: mocks.applyDailyNew,
  addWrongQuestion: mocks.addWrongQuestion,
  ensureDefaultStudyPlan: mocks.ensureDefaultStudyPlan,
  getActiveStudyPlans: mocks.getActiveStudyPlans,
  getAllCards: mocks.getAllCards,
  getClauseStates: mocks.getClauseStates,
  getDailyLog: mocks.getDailyLog,
  getDueWrongQuestions: mocks.getDueWrongQuestions,
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
  updateActivePlansDailyNew: mocks.updateActivePlansDailyNew,
  markClauseLearned: mocks.markClauseLearned,
  markWrongCorrect: mocks.markWrongCorrect,
  saveCard: mocks.saveCard,
  saveDailyLog: mocks.saveDailyLog,
  saveReviewLog: mocks.saveReviewLog,
}))

const clauseA = {
  id: 'SHL.SB.TYS.001',
  no: 1,
  text: '太阳之为病，脉浮，恶寒。',
  translation: '译A',
  annotations: [{ source: 's', author: 'a', text: 'a' }],
  formulas: [],
  symptomTags: [],
  studyTags: [],
}
const clauseB = {
  id: 'SHL.SB.TYS.002',
  no: 2,
  text: '太阳病，发热，汗出。',
  translation: '译B',
  annotations: [{ source: 's', author: 'a', text: 'a' }],
  formulas: [],
  symptomTags: [],
  studyTags: [],
}

const reviewCard: MemoryCard = {
  id: 'card:SHL.SB.TYS.001',
  clauseId: 'SHL.SB.TYS.001',
  due: new Date('2026-08-17T00:00:00.000Z'),
  state: 'Review',
  interval: 21,
  stability: 6,
  difficulty: 4,
  reps: 2,
  lapses: 0,
}

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

const mountOptions = {
  global: { stubs: { RouterLink: RouterLinkStub } },
}

describe('ui/StudyTaskView 每日任务', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadContent.mockResolvedValue({ clauses: [clauseA, clauseB] })
    mocks.buildQuizDeck.mockReturnValue([])
    mocks.getDueWrongQuestions.mockResolvedValue([])
    mocks.getTodayQueue.mockReturnValue({
      dueCards: [reviewCard],
      newClauses: [clauseB],
    })
    mocks.createCard.mockReturnValue({
      id: 'card:SHL.SB.TYS.002',
      clauseId: 'SHL.SB.TYS.002',
      due: new Date(),
      state: 'New',
      interval: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
    })
    mocks.reviewCard.mockReturnValue({
      card: { ...reviewCard, due: new Date() },
      log: { rating: 3 } as ReviewLog,
    })
  })

  it('先复习：翻面、三自评后进入下一项', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()

    expect(wrapper.text()).toContain('复习 · 太阳病上篇 · 第 1 条')

    // 未翻面时的动作按钮：点击查看原文
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('点击查看原文'))!
      .trigger('click')
    expect(wrapper.text()).toContain('释义')

    await wrapper.findAll('button').find((button) => button.text().includes('记得'))!.trigger('click')
    expect(wrapper.text()).toContain('记得')

    await wrapper.findAll('button').find((button) => button.text().includes('下一项'))!.trigger('click')
    await flushPromises()

    // 进入新学条文
    expect(wrapper.text()).toContain('新学 · 太阳病上篇 · 第 2 条')
  })

  it('学习页提供预填当前条文的纠错入口', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()

    const link = wrapper.find('a[href*="/feedback"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toContain('type=clause')
    expect(link.attributes('href')).toContain('location=')
  })

  it('到期错题并入每日队列，答对后计入打卡完成', async () => {
    mocks.getTodayQueue.mockReturnValue({ dueCards: [], newClauses: [] })
    mocks.getDueWrongQuestions.mockResolvedValue([
      {
        questionId: 'Q.WRONG',
        lastWrongAt: new Date('2026-08-18T08:00:00+08:00'),
        wrongCount: 1,
        resolved: false,
        dueAt: new Date('2026-08-18T08:00:00+08:00'),
        correctStreak: 0,
      },
    ])
    mocks.buildQuizDeck.mockReturnValue([
      {
        id: 'Q.WRONG',
        type: 'fill_blank',
        clause: 'SHL.SB.TYS.001',
        prompt: '错题巩固题干',
        options: ['正确选项', '干扰一', '干扰二', '干扰三'],
        answerIndex: 0,
        rationale: '解析内容',
        status: 'reviewed',
      },
    ])

    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()

    expect(wrapper.text()).toContain('错题巩固')
    expect(wrapper.text()).toContain('错题巩固题干')

    const correctOption = wrapper.findAll('button').find((b) => b.text().includes('正确选项'))
    expect(correctOption).toBeTruthy()
    await correctOption!.trigger('click')
    const submit = wrapper.findAll('button').find((b) => b.text().includes('提交答案'))
    await submit!.trigger('click')
    await flushPromises()

    expect(mocks.addQuizLog).toHaveBeenCalledWith(
      expect.objectContaining({ questionId: 'Q.WRONG', correct: true })
    )
    expect(mocks.markWrongCorrect).toHaveBeenCalledWith('Q.WRONG', expect.any(Date))

    const next = wrapper.findAll('button').find((b) => b.text().includes('下一项'))
    await next!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('今日任务已完成')
    expect(mocks.saveDailyLog).toHaveBeenCalledWith(
      expect.any(String),
      1,
      1
    )
  })

  it('新学完成后写打卡日志并显示完成', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()

    // 第一项是复习，第二项是新学；先完成复习
    await wrapper.findAll('button').find((b) => b.text().includes('点击查看原文'))!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('记得'))!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('下一项'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('新学 · 太阳病上篇 · 第 2 条')
    await wrapper.findAll('button').find((b) => b.text().includes('学会了'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('今日任务已完成')
    expect(mocks.markClauseLearned).toHaveBeenCalledWith('SHL.SB.TYS.002')
    expect(mocks.saveDailyLog).toHaveBeenCalled()
  })
})

describe('ui/StudyTaskView 任务量就地调整', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadContent.mockResolvedValue({ clauses: [clauseA, clauseB] })
    mocks.buildQuizDeck.mockReturnValue([])
    mocks.getTodayQueue.mockReturnValue({ dueCards: [reviewCard], newClauses: [clauseB] })
    mocks.createCard.mockReturnValue({
      id: 'card:SHL.SB.TYS.002',
      clauseId: 'SHL.SB.TYS.002',
      due: new Date(),
      state: 'New',
      interval: 0,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
    })
    mocks.getDueWrongQuestions.mockResolvedValue([])
    mocks.getSetting.mockResolvedValue(5)
    mocks.setSetting.mockResolvedValue(undefined)
    mocks.updateActivePlansDailyNew.mockResolvedValue(undefined)
  })

  it('顶部常驻任务量控件：预设 chips 与当前值高亮', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('每日任务量')
    for (const n of ['3', '5', '8', '10']) {
      expect(
        wrapper.findAll('button').some((b) => b.text().trim() === n),
        `缺少 ${n} chip`
      ).toBe(true)
    }
  })

  it('点击 chip 8：写设置 + 联动计划 + 立即重算队列', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()
    const queueCallsBefore = mocks.getTodayQueue.mock.calls.length

    await wrapper.findAll('button').find((b) => b.text().trim() === '8')!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(mocks.applyDailyNew).toHaveBeenCalledWith(8)
    expect(mocks.getTodayQueue.mock.calls.length).toBeGreaterThan(queueCallsBefore)
  })

  it('自定义输入 12 后应用，同样生效', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    await wrapper.findAll('button').find((b) => b.text().includes('自定义'))!.trigger('click')
    await flushPromises()
    const input = wrapper.find('input[aria-label="自定义每日任务量"]')
    expect(input.exists()).toBe(true)
    await input.setValue('12')
    await wrapper.findAll('button').find((b) => b.text().includes('应用'))!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(mocks.applyDailyNew).toHaveBeenCalledWith(12)
  })

  it('首次进入显示引导文案，点「我知道了」记录不再提示，但控件保留', async () => {
    mocks.getSetting
      .mockResolvedValueOnce(false)
      .mockResolvedValue(5)
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('任务量可以自己调整')
    await wrapper.findAll('button').find((b) => b.text().includes('我知道了'))!.trigger('click')
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('dailyTipDismissed', true)
    expect(wrapper.text()).not.toContain('任务量可以自己调整')
    expect(wrapper.text()).toContain('每日任务量') // 控件常驻
  })

  it('已关闭引导的用户只看到常驻控件', async () => {
    mocks.getSetting
      .mockResolvedValueOnce(true)
      .mockResolvedValue(5)
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).not.toContain('任务量可以自己调整')
    expect(wrapper.text()).toContain('每日任务量')
  })
})
