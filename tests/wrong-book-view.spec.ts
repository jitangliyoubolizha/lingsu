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
  loadContent: () => content(),
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

function content(): ContentData {
  return {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [],
    clauses: [],
    formulas: [],
    herbs: [],
    symptomTerms: [],
    questions: [wrongQuestion],
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

describe('WrongBookView 错题本', () => {
  beforeEach(() => {
    mocks.getWrongQuestions.mockReset()
    mocks.resolveWrongQuestion.mockClear()
  })

  it('展示未解决错题的题干、题型、来源与错次', async () => {
    mocks.getWrongQuestions.mockResolvedValue([
      {
        questionId: 'WRONG.1',
        lastWrongAt: new Date('2026-08-18T08:00:00+08:00'),
        wrongCount: 2,
        resolved: false,
      },
    ])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('错题本')
    expect(wrapper.text()).toContain('错题题干：太阳病提纲')
    expect(wrapper.text()).toContain('填空题')
    expect(wrapper.text()).toContain('太阳病上篇 · 第 1 条')
    expect(wrapper.text()).toContain('答错 2 次')
  })

  it('无未解决错题时显示空态', async () => {
    mocks.getWrongQuestions.mockResolvedValue([])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('暂无错题')
  })

  it('点击移出后标记解决并刷新为空态', async () => {
    mocks.getWrongQuestions
      .mockResolvedValueOnce([
        {
          questionId: 'WRONG.1',
          lastWrongAt: new Date('2026-08-18T08:00:00+08:00'),
          wrongCount: 1,
          resolved: false,
        },
      ])
      .mockResolvedValue([])

    const wrapper = mount(WrongBookView, {
      global: { plugins: [makeRouter()] },
    })
    await flushPromises()

    const remove = wrapper.findAll('button').find((b) => b.text().includes('移出错题本'))
    expect(remove).toBeTruthy()
    await remove!.trigger('click')
    await flushPromises()

    expect(mocks.resolveWrongQuestion).toHaveBeenCalledWith('WRONG.1')
    expect(wrapper.text()).toContain('暂无错题')
  })
})
