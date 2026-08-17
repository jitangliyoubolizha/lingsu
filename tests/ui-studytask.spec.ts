// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryCard, ReviewLog } from '../src/domain/memory'
import StudyTaskView from '../src/ui/views/StudyTaskView.vue'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  loadContent: vi.fn(),
  getTodayQueue: vi.fn(),
  createCard: vi.fn(),
  reviewCard: vi.fn(),
  ensureDefaultStudyPlan: vi.fn().mockResolvedValue(undefined),
  getActiveStudyPlans: vi.fn().mockResolvedValue([]),
  getAllCards: vi.fn().mockResolvedValue([]),
  getClauseStates: vi.fn().mockResolvedValue([]),
  getDailyLog: vi.fn().mockResolvedValue(undefined),
  markClauseLearned: vi.fn().mockResolvedValue(undefined),
  saveCard: vi.fn().mockResolvedValue(undefined),
  saveDailyLog: vi.fn().mockResolvedValue(undefined),
  saveReviewLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))
vi.mock('../src/data', () => ({
  loadContent: mocks.loadContent,
}))
vi.mock('../src/domain', () => ({
  createCard: mocks.createCard,
  getTodayQueue: mocks.getTodayQueue,
  reviewCard: mocks.reviewCard,
}))
vi.mock('../src/store', () => ({
  ensureDefaultStudyPlan: mocks.ensureDefaultStudyPlan,
  getActiveStudyPlans: mocks.getActiveStudyPlans,
  getAllCards: mocks.getAllCards,
  getClauseStates: mocks.getClauseStates,
  getDailyLog: mocks.getDailyLog,
  markClauseLearned: mocks.markClauseLearned,
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

describe('ui/StudyTaskView 每日任务', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadContent.mockReturnValue({ clauses: [clauseA, clauseB] })
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
    const wrapper = mount(StudyTaskView)
    await flushPromises()

    expect(wrapper.text()).toContain('复习 · SHL.SB.TYS.001')

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
    expect(wrapper.text()).toContain('新学 · SHL.SB.TYS.002')
  })

  it('新学完成后写打卡日志并显示完成', async () => {
    const wrapper = mount(StudyTaskView)
    await flushPromises()

    // 第一项是复习，第二项是新学；先完成复习
    await wrapper.findAll('button').find((b) => b.text().includes('点击查看原文'))!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('记得'))!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text().includes('下一项'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('新学 · SHL.SB.TYS.002')
    await wrapper.findAll('button').find((b) => b.text().includes('学会了'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('今日任务已完成')
    expect(mocks.markClauseLearned).toHaveBeenCalledWith('SHL.SB.TYS.002')
    expect(mocks.saveDailyLog).toHaveBeenCalled()
  })
})
