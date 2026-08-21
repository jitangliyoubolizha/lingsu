// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { createMemoryHistory, createRouter } from 'vue-router'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentData, Question } from '../src/data/types'
import WrongBookView from '../src/ui/views/WrongBookView.vue'

const mocks = vi.hoisted(() => ({
  getWrongQuestions: vi.fn(),
  resolveWrongQuestion: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../src/data', () => ({
  loadContent: () => Promise.resolve(content()),
}))

vi.mock('../src/store', () => ({
  getWrongQuestions: mocks.getWrongQuestions,
  resolveWrongQuestion: mocks.resolveWrongQuestion,
}))

const wrongQuestion: Question = {
  id: 'WRONG.1',
  type: 'fill_blank',
  clause: 'SHL.SB.TYS.001',
  prompt: '错题题干：太阳病提纲',
  options: ['恶寒', '恶风', '发热', '汗出'],
  answerIndex: 0,
  rationale: 'r',
  status: 'reviewed',
}

const futureQuestion: Question = {
  id: 'WRONG.FUTURE',
  type: 'clause_chain',
  clause: 'SHL.SB.TYS.002',
  prompt: '未来复测题干',
  options: ['甲', '乙', '丙', '丁'],
  answerIndex: 0,
  rationale: 'r',
  status: 'reviewed',
}

const masteredQuestion: Question = {
  id: 'WRONG.MASTERED',
  type: 'formula_syndrome_match',
  clause: 'SHL.SB.TYS.003',
  prompt: '已掌握题干',
  options: ['甲', '乙', '丙', '丁'],
  answerIndex: 0,
  rationale: 'r',
  status: 'reviewed',
}

function content(): ContentData {
  return {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [],
    clauses: [],
    formulas: [],
    herbs: [],
    symptomTerms: [],
    questions: [wrongQuestion, futureQuestion, masteredQuestion],
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/quiz', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
}

describe('WrongBookView 待巩固台账', () => {
  beforeEach(() => {
    mocks.getWrongQuestions.mockReset()
    mocks.resolveWrongQuestion.mockClear()
  })

  it('展示今日到期错题的题干、题型与来源，不再强调答错次数', async () => {
    const now = new Date()
    mocks.getWrongQuestions.mockResolvedValue([
      {
        questionId: 'WRONG.1',
        lastWrongAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        wrongCount: 2,
        resolved: false,
        dueAt: new Date(now.getTime() - 60_000),
        correctStreak: 0,
      },
    ])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('待巩固')
    expect(wrapper.text()).toContain('错题题干：太阳病提纲')
    expect(wrapper.text()).toContain('填空题')
    expect(wrapper.text()).toContain('太阳病上篇 · 第 1 条')
    expect(wrapper.text()).toContain('今日到期')
    expect(wrapper.text()).not.toContain('答错 2 次')
  })

  it('之后到期与已掌握分组折叠展示', async () => {
    const now = new Date()
    mocks.getWrongQuestions.mockResolvedValue([
      {
        questionId: 'WRONG.FUTURE',
        lastWrongAt: now,
        wrongCount: 1,
        resolved: false,
        dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        correctStreak: 1,
      },
      {
        questionId: 'WRONG.MASTERED',
        lastWrongAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        wrongCount: 1,
        resolved: true,
        dueAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        correctStreak: 2,
      },
    ])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('之后到期')
    expect(wrapper.text()).toContain('明天')
    expect(wrapper.text()).toContain('已掌握')
    expect(wrapper.text()).toContain('今日没有到期错题')
  })

  it('无错题时显示正向空态', async () => {
    mocks.getWrongQuestions.mockResolvedValue([])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无待巩固')
  })

  it('点击已掌握后标记解决并刷新为空态', async () => {
    const now = new Date()
    mocks.getWrongQuestions
      .mockResolvedValueOnce([
        {
          questionId: 'WRONG.1',
          lastWrongAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          wrongCount: 1,
          resolved: false,
          dueAt: new Date(now.getTime() - 60_000),
          correctStreak: 0,
        },
      ])
      .mockResolvedValue([])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    const master = wrapper.findAll('button').find((b) => b.text().includes('已掌握'))
    expect(master).toBeTruthy()
    await master!.trigger('click')
    await flushPromises()

    expect(mocks.resolveWrongQuestion).toHaveBeenCalledWith('WRONG.1')
    expect(wrapper.text()).toContain('暂无待巩固')
  })
})
