import { describe, expect, it } from 'vitest'

import { loadContent } from '../src/data'
import { buildQuizDeck, shuffleQuestionOptions } from '../src/domain/quiz'
import type { Question } from '../src/data/types'

function makeQuestion(): Question {
  return {
    id: 'Q.ORDER.1',
    type: 'fill_blank',
    clause: 'SHL.SB.TYS.001',
    prompt: '题干',
    options: ['正确', '甲', '乙', '丙'],
    answerIndex: 0,
    rationale: 'r',
    status: 'reviewed',
  }
}

describe('题库选项顺序', () => {
  it('洗牌后选项集合不变，answerIndex 指向原正确选项', () => {
    const randomValues = [0.99, 0, 0]
    const shuffled = shuffleQuestionOptions(makeQuestion(), () => randomValues.shift() ?? 0)

    expect([...shuffled.options].sort()).toEqual(['丙', '乙', '正确', '甲'])
    expect(shuffled.answerIndex).toBe(shuffled.options.indexOf('正确'))
    expect(shuffled.options[shuffled.answerIndex]).toBe('正确')
  })

  it('真实题库中复核题正确选项位置不全是 A，且正确内容不变', async () => {
    const content = await loadContent()
    const deck = buildQuizDeck(content)
    const reviewed = deck.filter((question) => question.status === 'reviewed')

    expect(reviewed.length).toBeGreaterThan(10)
    expect(new Set(reviewed.map((question) => question.answerIndex)).size).toBeGreaterThan(1)

    for (const question of reviewed) {
      const original = content.questions.find((item) => item.id === question.id)
      expect(original).toBeTruthy()
      if (!original) continue
      expect(question.options[question.answerIndex]).toBe(
        original.options[original.answerIndex]
      )
    }
  })
})
