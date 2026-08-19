// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import router from '../src/ui/router'

describe('ui 路由配置', () => {
  it('条文详情与搜索页标记自带合规横幅，供全局横幅让位', () => {
    const clauseDetail = router.resolve('/clauses/SHL.SB.TYS.001')
    expect(clauseDetail.meta.ownComplianceBanner).toBe(true)

    const search = router.resolve('/search')
    expect(search.meta.ownComplianceBanner).toBe(true)
  })

  it('注册意见反馈页路由', () => {
    expect(router.hasRoute('feedback')).toBe(true)
    const feedback = router.resolve('/feedback')
    expect(feedback.name).toBe('feedback')
    expect(feedback.meta.navKey).toBe('profile')
  })
})
