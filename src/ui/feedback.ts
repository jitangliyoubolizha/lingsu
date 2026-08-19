/**
 * 意见反馈：站内表单 + mailto 发送。
 * 纯函数便于测试；`submitFeedback` 是浏览器侧的唯一副作用出口。
 */
export const FEEDBACK_EMAIL = 'l2752255876@gmail.com'
export const APP_VERSION = '0.1.0'

export type FeedbackType = 'clause' | 'formula' | 'feature' | 'other'

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  clause: '条文错误',
  formula: '方剂错误',
  feature: '功能建议',
  other: '其他反馈',
}

export interface FeedbackInput {
  type: FeedbackType
  location: string
  description: string
  contact: string
  pageUrl: string
}

export type FeedbackResult =
  | { ok: true; mailto: string }
  | { ok: false; error: string }

export function buildFeedbackMailto(input: FeedbackInput): FeedbackResult {
  const location = input.location.trim()
  const description = input.description.trim()
  const contact = input.contact.trim()

  if (!description) {
    return { ok: false, error: '请填写问题描述' }
  }
  if (description.length > 500) {
    return { ok: false, error: '问题描述不能超过 500 字' }
  }
  if (location.length > 100) {
    return { ok: false, error: '位置或条号不能超过 100 字' }
  }
  if (contact.length > 100) {
    return { ok: false, error: '联系方式不能超过 100 字' }
  }

  const typeLabel = FEEDBACK_TYPE_LABELS[input.type]
  const subject = `[灵素反馈] ${typeLabel}`
  const lines = [
    `反馈类型：${typeLabel}`,
    `位置或条号：${location || '未填写'}`,
    `问题描述：${description}`,
    `联系方式：${contact || '未填写'}`,
    `来源页面：${input.pageUrl}`,
    `版本：${APP_VERSION}`,
  ]
  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  return { ok: true, mailto }
}

export function submitFeedback(mailto: string): void {
  window.location.href = mailto
}
