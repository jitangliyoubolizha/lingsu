// @vitest-environment jsdom
import { flushPromises, mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentData, Question } from '../src/data/types'
import QuizView from '../src/ui/views/QuizView.vue'

const route = { query: {} as Record<string, string | string[]> }

const mocks = vi.hoisted(() => ({
  markWrongCorrect: vi.fn().mockResolvedValue(undefined),
  getDueWrongQuestions: vi.fn().mockResolvedValue([]),
  addQuizLog: vi.fn().mockResolvedValue(1),
  addWrongQuestion: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
}))

vi.mock('../src/data', () => ({
  loadContent: () => content(),
}))

vi.mock('../src/store', () => ({
  addQuizLog: mocks.addQuizLog,
  addWrongQuestion: mocks.addWrongQuestion,
  getDueWrongQuestions: mocks.getDueWrongQuestions,
  markWrongCorrect: mocks.markWrongCorrect,
}))

const wrongQuestion: Question = {
  id: 'WRONG.1',
  type: 'fill_blank',
  clause: 'SHL.SB.TYS.001',
  prompt: '错题题干',
  options: ['正确选项', '干扰一', '干扰二', '干扰三'],
  answerIndex: 0,
  rationale: '解析内容',
  status: 'reviewed',
}

const otherQuestion: Question = {
  id: 'OTHER.2',
  type: 'clause_chain',
  clause: 'SHL.SB.TYS.002',
  prompt: '非错题题干',
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
    questions: [wrongQuestion, otherQuestion],
  }
}

describe('QuizView 错题重做模式', () => {
  beforeEach(() => {
    route.query = { wrong: '1' }
    mocks.markWrongCorrect.mockClear()
    mocks.getDueWrongQuestions.mockReset()
    mocks.addQuizLog.mockClear()
    mocks.addWrongQuestion.mockClear()
    mocks.getDueWrongQuestions.mockResolvedValue([
      {
        questionId: 'WRONG.1',
        lastWrongAt: new Date('2026-08-18T08:00:00+08:00'),
        wrongCount: 2,
        resolved: false,
        dueAt: new Date('2026-08-18T08:00:00+08:00'),
        correctStreak: 0,
      },
    ])
  })

  it('只加载未解决错题并显示错题重做标题', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('错题重做')
    expect(wrapper.text()).toContain('错题题干')
    expect(wrapper.text()).not.toContain('非错题题干')
    expect(wrapper.text()).toContain('第 1 题 / 共 1 题')
  })

  it('答对后按排期累计连续答对，并移出本轮队列', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    const correctOption = wrapper.findAll('button').find((b) => b.text().includes('正确选项'))
    expect(correctOption).toBeTruthy()
    await correctOption!.trigger('click')

    const submit = wrapper.findAll('button').find((b) => b.text().includes('提交答案'))
    expect(submit).toBeTruthy()
    await submit!.trigger('click')
    await flushPromises()

    expect(mocks.markWrongCorrect).toHaveBeenCalledWith('WRONG.1', expect.any(Date))

    const finish = wrapper.findAll('button').find((b) => b.text().includes('完成'))
    expect(finish).toBeTruthy()
    await finish!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('错题已清空')
  })
})
