// @vitest-environment jsdom
import { mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import FeedbackView from '../src/ui/views/FeedbackView.vue'

const feedbackMocks = vi.hoisted(() => ({
  build: vi.fn(),
  submit: vi.fn(),
}))
vi.mock('../src/ui/feedback', () => ({
  buildFeedbackMailto: feedbackMocks.build,
  submitFeedback: feedbackMocks.submit,
  FEEDBACK_EMAIL: 'test@example.com',
  FEEDBACK_TYPE_LABELS: {
    clause: '条文错误',
    formula: '方剂错误',
    feature: '功能建议',
    other: '其他反馈',
  },
}))

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
    back: routerMocks.back,
    options: { history: { state: { back: null } } },
  }),
}))

describe('ui 反馈表单', () => {
  beforeEach(() => {
    feedbackMocks.build.mockReset()
    feedbackMocks.submit.mockReset()
    feedbackMocks.build.mockReturnValue({
      ok: true,
      mailto: 'mailto:test@example.com',
    })
  })

  it('渲染标题、类型、描述框与反馈邮箱提示', () => {
    const wrapper = mount(FeedbackView)
    expect(wrapper.text()).toContain('意见反馈')
    expect(wrapper.find('select').exists()).toBe(true)
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).toContain('test@example.com')
  })

  it('问题描述为空时提交按钮禁用', () => {
    const wrapper = mount(FeedbackView)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('填写描述后提交生成邮件并给出成功提示', async () => {
    const wrapper = mount(FeedbackView)
    await wrapper.get('textarea').setValue('第 12 条译文有误')

    await wrapper.get('form').trigger('submit')

    expect(feedbackMocks.build).toHaveBeenCalledTimes(1)
    expect(feedbackMocks.build.mock.calls[0][0]).toMatchObject({
      type: 'clause',
      description: '第 12 条译文有误',
    })
    expect(feedbackMocks.submit).toHaveBeenCalledWith('mailto:test@example.com')
    expect(wrapper.text()).toContain('已打开邮件应用')
  })

  it('切换反馈类型后按所选类型提交', async () => {
    const wrapper = mount(FeedbackView)
    await wrapper.get('select').setValue('formula')
    await wrapper.get('textarea').setValue('剂量写错')
    await wrapper.get('form').trigger('submit')

    expect(feedbackMocks.build.mock.calls[0][0]).toMatchObject({ type: 'formula' })
  })

  it('校验失败时显示错误且不打开邮件', async () => {
    feedbackMocks.build.mockReturnValue({
      ok: false,
      error: '位置或条号不能超过 100 字',
    })
    const wrapper = mount(FeedbackView)
    await wrapper.get('textarea').setValue('错字')
    await wrapper.get('form').trigger('submit')

    expect(feedbackMocks.submit).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('位置或条号不能超过 100 字')
  })
})
