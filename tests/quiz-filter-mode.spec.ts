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
  routerPush: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push: mocks.routerPush,
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
}))

vi.mock('../src/data', () => ({
  loadContent: () => Promise.resolve(content()),
  loadMeta: () => ({
    ...content(),
    chapters: content().chapters.map((chapter) => ({
      code: chapter.code,
      name: chapter.name,
      order: chapter.order,
      clauseCount: chapter.clauses.length,
    })),
    clauseOrder: content().chapters.flatMap((chapter) =>
      chapter.clauses.map((clause) => clause.id)
    ),
  }),
}))

vi.mock('../src/store', () => ({
  addQuizLog: mocks.addQuizLog,
  addWrongQuestion: mocks.addWrongQuestion,
  getDueWrongQuestions: mocks.getDueWrongQuestions,
  markWrongCorrect: mocks.markWrongCorrect,
}))

function makeQuestion(id: string, type: Question['type'], clauseRef: string): Question {
  return {
    id,
    type,
    clause: clauseRef,
    prompt: `题干 ${id}`,
    options: ['甲', '乙', '丙', '丁'],
    answerIndex: 0,
    rationale: 'r',
    status: 'reviewed',
  }
}

const questions: Question[] = [
  makeQuestion('Q.1', 'fill_blank', 'SHL.SB.TYS.001'),
  makeQuestion('Q.2', 'clause_chain', 'SHL.SB.TYS.002'),
  makeQuestion('Q.3', 'fill_blank', 'SHL.SB.TYZ.001'),
  makeQuestion('Q.4', 'formula_composition', 'SHL.SB.TYX.001'),
]

function content(): ContentData {
  return {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [
      {
        code: 'TYS',
        name: '辨太阳病脉证并治上',
        order: 1,
        clauses: [
          {
            id: 'SHL.SB.TYS.001',
            no: 1,
            text: '太阳之为病，脉浮，头项强痛而恶寒。',
            translation: 't',
            annotations: [{ source: 's', author: 'a', text: 'a' }],
            formulas: [],
            symptomTags: [],
            studyTags: [],
          },
          {
            id: 'SHL.SB.TYS.002',
            no: 2,
            text: '太阳病，发热，汗出，恶风，脉缓者，名为中风。',
            translation: 't',
            annotations: [{ source: 's', author: 'a', text: 'a' }],
            formulas: [],
            symptomTags: [],
            studyTags: [],
          },
        ],
      },
      {
        code: 'TYZ',
        name: '辨太阳病脉证并治中',
        order: 2,
        clauses: [
          {
            id: 'SHL.SB.TYZ.001',
            no: 31,
            text: '太阳病，项背强几几，无汗恶风者，属葛根汤证。',
            translation: 't',
            annotations: [{ source: 's', author: 'a', text: 'a' }],
            formulas: [],
            symptomTags: [],
            studyTags: [],
          },
        ],
      },
      {
        code: 'TYX',
        name: '辨太阳病脉证并治下',
        order: 3,
        clauses: [
          {
            id: 'SHL.SB.TYX.001',
            no: 128,
            text: '问曰：病有结胸，有藏结，其状何如？',
            translation: 't',
            annotations: [{ source: 's', author: 'a', text: 'a' }],
            formulas: [],
            symptomTags: [],
            studyTags: [],
          },
        ],
      },
    ],
    clauses: [],
    formulas: [],
    herbs: [],
    symptomTerms: [],
    questions,
  }
}

function findButton(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))
}

describe('QuizView 刷题模式选择', () => {
  beforeEach(() => {
    route.query = {}
    mocks.markWrongCorrect.mockClear()
    mocks.getDueWrongQuestions.mockReset()
    mocks.addQuizLog.mockClear()
    mocks.addWrongQuestion.mockClear()
    mocks.routerPush.mockClear()
  })

  it('无查询参数时先显示模式选择，不直接出题', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('随机综合')
    expect(wrapper.text()).toContain('按篇刷题')
    expect(wrapper.text()).toContain('按题型刷题')
    expect(wrapper.text()).toContain('待巩固错题')
    expect(wrapper.text()).toContain('太阳病上篇')
    expect(wrapper.text()).toContain('太阳病中篇')
    expect(wrapper.text()).toContain('太阳病下篇')
    expect(wrapper.text()).toContain('填空题')
    expect(wrapper.text()).toContain('条文接龙')
    expect(wrapper.text()).toContain('方证匹配')
    expect(wrapper.text()).toContain('方剂组成')
    expect(wrapper.text()).not.toContain('第 1 题')
  })

  it('点击随机综合后开始答题，题库包含全部题目', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    await findButton(wrapper, '随机综合')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 题 / 共 4 题')
    expect(wrapper.text()).toContain('题干')
  })

  it('点击篇章 chip 后只出该篇题目并显示篇名', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    await findButton(wrapper, '太阳病中篇')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 题 / 共 1 题')
    expect(wrapper.text()).toContain('题干 Q.3')
    expect(wrapper.text()).toContain('太阳病中篇')
    expect(wrapper.text()).not.toContain('题干 Q.1')
  })

  it('点击题型 chip 后只出该题型题目', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    await findButton(wrapper, '填空题')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 题 / 共 2 题')
    expect(wrapper.text()).toContain('题干 Q.1')
  })

  it('筛选结果为空时显示空态', async () => {
    const wrapper = mount(QuizView)
    await flushPromises()

    await findButton(wrapper, '方证匹配')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('该筛选下暂无题目')
  })

  it('点击待巩固错题进入错题重做模式', async () => {
    mocks.getDueWrongQuestions.mockResolvedValue([
      {
        questionId: 'Q.1',
        lastWrongAt: new Date('2026-08-18T08:00:00+08:00'),
        wrongCount: 2,
        resolved: false,
        dueAt: new Date('2026-08-18T08:00:00+08:00'),
        correctStreak: 0,
      },
    ])
    const wrapper = mount(QuizView)
    await flushPromises()

    await findButton(wrapper, '待巩固错题')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('错题重做')
    expect(wrapper.text()).toContain('题干 Q.1')
    expect(wrapper.text()).not.toContain('题干 Q.2')
  })
})

describe('QuizView 深链筛选模式', () => {
  beforeEach(() => {
    mocks.getDueWrongQuestions.mockReset()
    mocks.getDueWrongQuestions.mockResolvedValue([])
  })

  it('?chapter=TYS 直接进入按篇刷题', async () => {
    route.query = { chapter: 'TYS' }
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 题 / 共 2 题')
    expect(wrapper.text()).toContain('题干 Q.1')
    expect(wrapper.text()).not.toContain('题干 Q.3')
  })

  it('?type=fill_blank 直接进入按题型刷题', async () => {
    route.query = { type: 'fill_blank' }
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 题 / 共 2 题')
    expect(wrapper.text()).toContain('题干 Q.1')
    expect(wrapper.text()).not.toContain('题干 Q.2')
  })

  it('?mode=random 直接进入随机综合', async () => {
    route.query = { mode: 'random' }
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('随机综合')
    expect(wrapper.text()).toContain('第 1 题 / 共 4 题')
  })

  it('非法题型参数回退到模式选择', async () => {
    route.query = { type: 'nonsense' }
    const wrapper = mount(QuizView)
    await flushPromises()

    expect(wrapper.text()).toContain('随机综合')
    expect(wrapper.text()).not.toContain('第 1 题')
  })
})
