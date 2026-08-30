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

  it('注册中药列表页路由并标记底部导航', () => {
    expect(router.hasRoute('herbs')).toBe(true)
    const herbs = router.resolve('/herbs')
    expect(herbs.name).toBe('herbs')
    expect(herbs.meta.navKey).toBe('herbs')
    expect(herbs.meta.bottomNav).toBe(true)
  })

  it('注册意见反馈页路由', () => {
    expect(router.hasRoute('feedback')).toBe(true)
    const feedback = router.resolve('/feedback')
    expect(feedback.name).toBe('feedback')
    expect(feedback.meta.navKey).toBe('profile')
  })

  it('注册免责声明全文页路由', () => {
    expect(router.hasRoute('disclaimer')).toBe(true)
    const disclaimer = router.resolve('/disclaimer')
    expect(disclaimer.name).toBe('disclaimer')
  })
})
