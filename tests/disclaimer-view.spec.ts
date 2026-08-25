// @vitest-environment jsdom
import { mount } from '@vue/test-utils'

import { describe, expect, it, vi } from 'vitest'

import DisclaimerView from '../src/ui/views/DisclaimerView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    options: { history: { state: { back: null } } },
  }),
  useRoute: () => ({ params: {}, fullPath: '/' }),
}))

describe('DisclaimerView 免责声明全文页', () => {
  it('渲染完整协议的关键条款', () => {
    const wrapper = mount(DisclaimerView)

    const text = wrapper.text()
    expect(text).toContain('用户协议与免责声明')
    expect(text).toContain('仅供学习研究使用，不构成医疗建议')
    expect(text).toContain('处方必须由执业医师开具')
    expect(text).toContain('不提供诊断、治疗方案、用药推荐')
    expect(text).toContain('一、服务说明')
    expect(text).toContain('二、非医疗声明')
    expect(text).toContain('六、免责条款')
    expect(text).toContain('九、附则')
  })
})
