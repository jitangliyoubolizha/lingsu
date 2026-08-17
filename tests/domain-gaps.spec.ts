import { describe, expect, it } from 'vitest'

import type { Clause, ContentData } from '../src/data/types'
import { createCard, getTodayQueue, type StudyPlan } from '../src/domain/memory'
import { generateAutoQuestions } from '../src/domain/quiz'
import {
  buildSearchIndex,
  groupSearchResults,
  searchContent,
} from '../src/domain/search'

function makeClause(id: string, no: number, text = '示例条文。'): Clause {
  return {
    id,
    no,
    text,
    translation: 't',
    annotations: [{ source: 's', author: 'a', text: 'a' }],
    formulas: [],
    symptomTags: [],
    studyTags: [],
  }
}

const now = new Date('2026-08-17T08:00:00+08:00')

describe('memory/queue 缺口用例', () => {
  it('默认队列上限 20：到期复习优先、新学顺延', () => {
    const dueCards = Array.from({ length: 20 }, (_, index) => ({
      ...createCard(`SHL.SB.TYS.${String(index + 1).padStart(3, '0')}`, now),
      state: 'Review' as const,
      due: new Date(now.getTime() - 1000),
    }))
    const plan: StudyPlan = {
      id: 'p',
      name: '上篇',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
      dailyNew: 5,
      startDate: '2026-08-17',
      status: 'active',
    }
    const clauses = [
      makeClause('SHL.SB.TYS.001', 1),
      makeClause('SHL.SB.TYS.002', 2),
      makeClause('SHL.SB.TYS.003', 3),
    ]
    const queue = getTodayQueue(dueCards, [plan], clauses, new Set(), 20, now)
    expect(queue.dueCards).toHaveLength(20)
    expect(queue.newClauses).toHaveLength(0)
  })

  it('两个 active 计划分别取新条文并合并', () => {
    const planA: StudyPlan = {
      id: 'a',
      name: '上篇',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
      dailyNew: 1,
      startDate: '2026-08-17',
      status: 'active',
    }
    const planB: StudyPlan = {
      id: 'b',
      name: '中篇',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYZ'] },
      dailyNew: 1,
      startDate: '2026-08-17',
      status: 'active',
    }
    const clauses = [
      makeClause('SHL.SB.TYS.001', 1),
      makeClause('SHL.SB.TYZ.031', 31),
    ]
    const queue = getTodayQueue([], [planA, planB], clauses, new Set(), 20, now)
    expect(queue.newClauses.map((c) => c.id).sort()).toEqual([
      'SHL.SB.TYS.001',
      'SHL.SB.TYZ.031',
    ])
  })

  it('同一条文被多个计划覆盖时只出现一次', () => {
    const planA: StudyPlan = {
      id: 'a',
      name: '上篇A',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
      dailyNew: 5,
      startDate: '2026-08-17',
      status: 'active',
    }
    const planB: StudyPlan = {
      id: 'b',
      name: '上篇B',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
      dailyNew: 5,
      startDate: '2026-08-17',
      status: 'active',
    }
    const clauses = [makeClause('SHL.SB.TYS.001', 1), makeClause('SHL.SB.TYS.002', 2)]
    const queue = getTodayQueue([], [planA, planB], clauses, new Set(), 20, now)
    expect(queue.newClauses.map((c) => c.id)).toEqual(['SHL.SB.TYS.001', 'SHL.SB.TYS.002'])
  })

  it('非 active 计划不计入新学', () => {
    const active: StudyPlan = {
      id: 'a',
      name: '上篇',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYS'] },
      dailyNew: 2,
      startDate: '2026-08-17',
      status: 'active',
    }
    const done: StudyPlan = {
      id: 'b',
      name: '完成计划',
      scope: { book: 'SHL', edition: 'SB', chapters: ['TYZ'] },
      dailyNew: 2,
      startDate: '2026-08-17',
      status: 'completed',
    }
    const clauses = [makeClause('SHL.SB.TYS.001', 1), makeClause('SHL.SB.TYZ.031', 31)]
    const queue = getTodayQueue([], [active, done], clauses, new Set(), 20, now)
    expect(queue.newClauses.map((c) => c.id)).toEqual(['SHL.SB.TYS.001'])
  })
})

describe('quiz/generator 缺口用例', () => {
  function richContent(): ContentData {
    return {
      book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
      edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
      chapters: [],
      clauses: [
        {
          id: 'SHL.SB.TYS.001',
          no: 1,
          text: '太阳之为病，脉浮，头项强痛而恶寒。',
          translation: 't',
          annotations: [{ source: 's', author: 'a', text: 'a' }],
          formulas: ['SHL.SB.F.001'],
          symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.002', 'SHL.SB.SYM.003'],
          studyTags: [],
        },
        {
          id: 'SHL.SB.TYS.002',
          no: 2,
          text: '太阳病，发热，汗出，脉缓。',
          translation: 't',
          annotations: [{ source: 's', author: 'a', text: 'a' }],
          formulas: ['SHL.SB.F.002'],
          symptomTags: ['SHL.SB.SYM.004', 'SHL.SB.SYM.005', 'SHL.SB.SYM.006'],
          studyTags: [],
        },
      ],
      formulas: [
        {
          id: 'SHL.SB.F.001',
          name: '桂枝汤',
          category: '类',
          composition: [{ herb: 'SHL.SB.H.001', dose: '三两' }],
          originalDoseText: '',
          doseReference: '',
          decoction: '',
          relatedClauses: ['SHL.SB.TYS.001'],
          relatedFormulas: [],
          safetyNotice: 'x',
          mainSymptoms: [],
          pulse: [],
          pathomechanism: '',
        },
        {
          id: 'SHL.SB.F.002',
          name: '麻黄汤',
          category: '类',
          composition: [{ herb: 'SHL.SB.H.005', dose: '三两' }],
          originalDoseText: '',
          doseReference: '',
          decoction: '',
          relatedClauses: ['SHL.SB.TYS.002'],
          relatedFormulas: [],
          safetyNotice: 'x',
          mainSymptoms: [],
          pulse: [],
          pathomechanism: '',
        },
      ],
      herbs: [
        { id: 'SHL.SB.H.001', name: '桂枝', aliases: [] },
        { id: 'SHL.SB.H.002', name: '芍药', aliases: [] },
        { id: 'SHL.SB.H.003', name: '甘草', aliases: [] },
        { id: 'SHL.SB.H.004', name: '生姜', aliases: [] },
        { id: 'SHL.SB.H.005', name: '麻黄', aliases: [] },
      ],
      symptomTerms: [
        { id: 'SHL.SB.SYM.001', name: '恶寒', category: '症状', aliases: [] },
        { id: 'SHL.SB.SYM.002', name: '脉浮', category: '脉象', aliases: [] },
        { id: 'SHL.SB.SYM.003', name: '头项强痛', category: '症状', aliases: [] },
        { id: 'SHL.SB.SYM.004', name: '发热', category: '症状', aliases: [] },
        { id: 'SHL.SB.SYM.005', name: '汗出', category: '症状', aliases: [] },
        { id: 'SHL.SB.SYM.006', name: '脉缓', category: '脉象', aliases: [] },
      ],
      questions: [],
    }
  }

  function smallContent(): ContentData {
    // 最小数据：用于验证数据不足时优雅降级
    return {
      book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
      edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
      chapters: [],
      clauses: [
        {
          id: 'SHL.SB.TYS.001',
          no: 1,
          text: '太阳之为病，脉浮，头项强痛而恶寒。',
          translation: 't',
          annotations: [{ source: 's', author: 'a', text: 'a' }],
          formulas: ['SHL.SB.F.001'],
          symptomTags: ['SHL.SB.SYM.001', 'SHL.SB.SYM.002', 'SHL.SB.SYM.003'],
          studyTags: [],
        },
      ],
      formulas: [
        {
          id: 'SHL.SB.F.001',
          name: '桂枝汤',
          category: '类',
          composition: [{ herb: 'SHL.SB.H.001', dose: '三两' }],
          originalDoseText: '',
          doseReference: '',
          decoction: '',
          relatedClauses: ['SHL.SB.TYS.001'],
          relatedFormulas: [],
          safetyNotice: 'x',
          mainSymptoms: [],
          pulse: [],
          pathomechanism: '',
        },
      ],
      herbs: [
        { id: 'SHL.SB.H.001', name: '桂枝', aliases: [] },
        { id: 'SHL.SB.H.002', name: '芍药', aliases: [] },
      ],
      symptomTerms: [
        { id: 'SHL.SB.SYM.001', name: '恶寒', category: '症状', aliases: [] },
        { id: 'SHL.SB.SYM.002', name: '脉浮', category: '脉象', aliases: [] },
        { id: 'SHL.SB.SYM.003', name: '头项强痛', category: '症状', aliases: [] },
      ],
      questions: [],
    }
  }

  it('挖空题正确选项在原文中有依据', () => {
    const questions = generateAutoQuestions(richContent(), 'SHL.SB.TYS.001')
    const fillBlank = questions.find((q) => q.type === 'fill_blank')
    expect(fillBlank).toBeDefined()
    const answer = fillBlank?.options[fillBlank?.answerIndex ?? 0]
    expect(richContent().clauses[0].text).toContain(answer ?? '')
  })

  it('所有自动题选项不重复且数量为 4', () => {
    const questions = generateAutoQuestions(richContent(), 'SHL.SB.TYS.001')
    expect(questions.length).toBeGreaterThan(0)
    for (const question of questions) {
      expect(new Set(question.options).size).toBe(4)
    }
  })

  it('数据不足时优雅降级且不抛错', () => {
    const content = smallContent()
    // 药物过少，方剂组成题无法生成完整 4 选项
    const questions = generateAutoQuestions(content)
    expect(questions.some((q) => q.type === 'formula_composition')).toBe(false)
  })
})

describe('search 缺口用例', () => {
  const content: ContentData = {
    book: { code: 'SHL', name: '伤寒论', editions: [{ code: 'SB', name: '宋本' }] },
    edition: { code: 'SB', book: 'SHL', name: '宋本', source: 't', chapters: [] },
    chapters: [],
    clauses: [
      {
        id: 'SHL.SB.TYS.001',
        no: 1,
        text: '太阳之为病，脉浮，恶寒。',
        translation: '怕冷',
        annotations: [],
        formulas: [],
        symptomTags: [],
        studyTags: ['太阳病提纲'],
      },
    ],
    formulas: [],
    herbs: [],
    symptomTerms: [],
    questions: [],
  }

  it('多关键词默认 AND：全部命中才返回', () => {
    const index = buildSearchIndex(content)
    expect(searchContent(index, '太阳 恶寒').length).toBeGreaterThan(0)
    expect(searchContent(index, '太阳 不存在的词')).toEqual([])
  })

  it('空查询返回空结果', () => {
    const index = buildSearchIndex(content)
    expect(searchContent(index, '')).toEqual([])
  })

  it('无命中返回空结果且分组均为空', () => {
    const index = buildSearchIndex(content)
    const results = searchContent(index, '完全不存在')
    expect(results).toEqual([])
    const grouped = groupSearchResults(results)
    expect(grouped.clauses).toEqual([])
    expect(grouped.formulas).toEqual([])
    expect(grouped.herbs).toEqual([])
  })
})
