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
  addWrongQuestion: mocks.addWrongQuestion,
  ensureDefaultStudyPlan: mocks.ensureDefaultStudyPlan,
  getActiveStudyPlans: mocks.getActiveStudyPlans,
  getAllCards: mocks.getAllCards,
  getClauseStates: mocks.getClauseStates,
  getDailyLog: mocks.getDailyLog,
  getDueWrongQuestions: mocks.getDueWrongQuestions,
  getSetting: mocks.getSetting,
  setSetting: mocks.setSetting,
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

describe('ui/StudyTaskView 首次进入任务量提醒', () => {
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
    mocks.getSetting.mockResolvedValue(false)
    mocks.setSetting.mockResolvedValue(undefined)
  })

  it('首次进入显示任务量提示，含推荐值与「去设置」入口', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('任务量可以自己调整')
    expect(wrapper.text()).toContain('自定义')
    expect(wrapper.text()).toContain('5 条')
    const go = wrapper.findAll('button, a').find((el) => el.text().includes('去设置'))
    expect(go).toBeTruthy()
  })

  it('点击「我知道了」写入 dailyTipDismissed 且提示消失', async () => {
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    const ok = wrapper.findAll('button').find((b) => b.text().includes('我知道了'))
    expect(ok).toBeTruthy()
    await ok!.trigger('click')
    await flushPromises()

    expect(mocks.setSetting).toHaveBeenCalledWith('dailyTipDismissed', true)
    expect(wrapper.text()).not.toContain('去设置')
  })

  it('已关闭过提醒的用户不再看到提示', async () => {
    mocks.getSetting.mockResolvedValue(true)
    const wrapper = mount(StudyTaskView, mountOptions)
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).not.toContain('去设置')
  })
})
