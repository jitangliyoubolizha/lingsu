import { describe, expect, it } from 'vitest'

import {
  buildFeedbackMailto,
  FEEDBACK_EMAIL,
  type FeedbackInput,
} from '../src/ui/feedback'

function baseInput(overrides: Partial<FeedbackInput> = {}): FeedbackInput {
  return {
    type: 'clause',
    location: '太阳·第 12 条',
    description: '原文“脉缓”疑似有误。',
    contact: 'test@example.com',
    pageUrl: 'http://localhost/#/clauses/SHL.SB.TYS.012',
    ...overrides,
  }
}

describe('ui/feedback buildFeedbackMailto', () => {
  it('生成发给反馈邮箱的 mailto，并包含主题与正文', () => {
    const result = buildFeedbackMailto(baseInput())
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')

    expect(result.mailto.startsWith(`mailto:${FEEDBACK_EMAIL}?subject=`)).toBe(true)
    const [prefix, encodedBody] = result.mailto.split('body=')
    expect(prefix).toContain('subject=')
    expect(encodedBody).toBeTruthy()

    const body = decodeURIComponent(encodedBody)
    expect(body).toContain('反馈类型：条文错误')
    expect(body).toContain('位置或条号：太阳·第 12 条')
    expect(body).toContain('问题描述：原文“脉缓”疑似有误。')
    expect(body).toContain('联系方式：test@example.com')
    expect(body).toContain('来源页面：http://localhost/#/clauses/SHL.SB.TYS.012')
    expect(body).toContain('版本：0.1.0')
  })

  it('对中文与换行做 URI 编码', () => {
    const result = buildFeedbackMailto(
      baseInput({ description: '第一行\n第二行 错字' })
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.mailto).toContain('%0A')
    expect(result.mailto).toContain('%E7%AC%AC%E4%B8%80%E8%A1%8C')
    expect(result.mailto).not.toContain('第一行')
  })

  it('问题描述为空时校验失败', () => {
    const result = buildFeedbackMailto(baseInput({ description: '   ' }))
    expect(result).toEqual({ ok: false, error: '请填写问题描述' })
  })

  it('问题描述超过 500 字时校验失败', () => {
    const result = buildFeedbackMailto(baseInput({ description: '错'.repeat(501) }))
    expect(result).toEqual({ ok: false, error: '问题描述不能超过 500 字' })
  })

  it('位置或条号超过 100 字时校验失败', () => {
    const result = buildFeedbackMailto(baseInput({ location: '条'.repeat(101) }))
    expect(result).toEqual({ ok: false, error: '位置或条号不能超过 100 字' })
  })

  it('联系方式超过 100 字时校验失败', () => {
    const result = buildFeedbackMailto(baseInput({ contact: 'a'.repeat(101) }))
    expect(result).toEqual({ ok: false, error: '联系方式不能超过 100 字' })
  })

  it('四种反馈类型都有中文主题标签', () => {
    const cases = [
      ['clause', '条文错误'],
      ['formula', '方剂错误'],
      ['feature', '功能建议'],
      ['other', '其他反馈'],
    ] as const
    for (const [type, label] of cases) {
      const result = buildFeedbackMailto(baseInput({ type }))
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('expected ok')
      expect(decodeURIComponent(result.mailto)).toContain(`[灵素反馈] ${label}`)
    }
  })
})
