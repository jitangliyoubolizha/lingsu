/**
 * E2E — 条文详情横滑翻条（E-15）
 *
 * 覆盖：触摸左滑下一条 / 右滑上一条（CDP 真实触摸事件）、纵向滚动不受手势影响、
 * 尽头方向（第一条）不翻页、键盘 ←/→ 翻条、scrollBehavior 回顶。
 * 另产出移动端浅色/深色、桌面端截图供视觉验收（test-results/swipe-artifacts/）。
 */
import { expect, test, type Page } from '@playwright/test'

/** CDP 派发真实触摸拖动（生成 pointerType=touch 的 Pointer Events） */
async function touchSwipe(page: Page, from: { x: number; y: number }, dx: number, steps = 8) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (dx * i) / steps, y: from.y }],
    })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function agreeAndGoHome(page: Page) {
  await page.goto('/')
  await page.waitForURL('**/#/agreement')
  await page.locator('input[type="checkbox"]').check()
  await page.locator('button:has-text("同意并开始学习")').click()
  await page.waitForURL('**/#/')
}

/** 并行转场期间新旧两个 h1 短暂共存：先等目标页的 h1 出现，再等旧页卸载、布局收拢 */
async function expectH1(page: Page, text: string) {
  await expect(page.locator('h1').filter({ hasText: text })).toHaveCount(1, { timeout: 8000 })
  await expect(page.locator('main > div')).toHaveCount(1, { timeout: 8000 })
}

async function openClause(page: Page, id: string, no: string) {
  await page.goto(`/#/clauses/${id}`)
  await page.waitForURL(`**/#/clauses/${id}`)
  await expectH1(page, `第 ${no} 条`)
  // 等入场编舞与印章动画落定，避免截图半程
  await page.waitForTimeout(700)
}

test.describe('条文横滑翻条（移动端视口）', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('左滑下一条、右滑上一条、纵向滚动不受影响、尽头不翻页、键盘翻条', async ({ page }) => {
    await agreeAndGoHome(page)
    await openClause(page, 'SHL.SB.TYS.012', '12')

    // 静止时相邻页必须完全不可见：内容柱 overflow-x-clip，可见部分（与内容柱交集）为零
    const idle = await page.evaluate(`(() => {
      const root = document.querySelector('main .overflow-x-clip')
      const rootRect = root.getBoundingClientRect()
      const rectOf = (sel) => document.querySelector(sel).getBoundingClientRect()
      const visibleWidth = (rect) =>
        Math.max(0, Math.min(rect.right, rootRect.right) - Math.max(rect.left, rootRect.left))
      return {
        overflowX: getComputedStyle(root).overflowX,
        prevVisible: visibleWidth(rectOf('[data-test="pager-prev"]')),
        nextVisible: visibleWidth(rectOf('[data-test="pager-next"]')),
      }
    })()`)
    expect(idle.overflowX).toBe('clip')
    expect(idle.prevVisible).toBeLessThanOrEqual(0.5)
    expect(idle.nextVisible).toBeLessThanOrEqual(0.5)

    // 视觉验收：移动端浅色（视口 + 全页）
    await page.screenshot({ path: 'test-results/swipe-artifacts/clause-mobile-light.png' })
    await page.screenshot({
      path: 'test-results/swipe-artifacts/clause-mobile-light-full.png',
      fullPage: true,
    })

    // 1) 触摸左滑 → 第 13 条；拖动中下一整页应自边缘跟入视口（真分页轨道）
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 300, y: 360 }],
    })
    for (let i = 1; i <= 3; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 300 - i * 45, y: 360 }],
      })
      await page.waitForTimeout(16)
    }
    const pager = await page.evaluate(`(() => {
      const el = document.querySelector('[data-test="pager-next"]')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return { left: rect.left, width: rect.width, vw: innerWidth, visibleWidth: Math.min(rect.right, innerWidth) - rect.left }
    })()`)
    expect(pager).not.toBeNull()
    // 下一整页已跟入视口且可见部分有实质宽度
    expect(pager.left).toBeLessThan(pager.vw)
    expect(pager.visibleWidth).toBeGreaterThan(80)
    for (let i = 4; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 300 - i * 45, y: 360 }],
      })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    // 滑动交接（~260ms）完成后才换页
    await page.waitForURL('**/#/clauses/SHL.SB.TYS.013', { timeout: 8000 })
    await expectH1(page, '第 13 条')
    expect(page.url()).toContain('SHL.SB.TYS.013')

    // 2) 触摸右滑 → 回到第 12 条（方向性转场 page-prev）
    await touchSwipe(page, { x: 150, y: 360 }, 200)
    await expectH1(page, '第 12 条')

    // 3) 纵向触摸拖动 → 页面正常滚动、不翻条
    await touchSwipeVertical(page, { x: 195, y: 700 }, -280)
    await expectH1(page, '第 12 条')
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeGreaterThan(50)
    expect(page.url()).toContain('SHL.SB.TYS.012')

    // 4) 尽头方向：第一条右滑不翻页
    await openClause(page, 'SHL.SB.TYS.001', '1')
    await touchSwipe(page, { x: 120, y: 360 }, 250, 6)
    await page.waitForTimeout(600)
    expect(page.url()).toContain('SHL.SB.TYS.001')
    await expectH1(page, '第 1 条')

    // 5) 键盘 → / ←（桌面同款路径）
    await page.keyboard.press('ArrowRight')
    await expectH1(page, '第 2 条')
    await page.keyboard.press('ArrowLeft')
    await expectH1(page, '第 1 条')

    // 6) 条文间切换回顶（scrollBehavior）
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.keyboard.press('ArrowRight')
    await expectH1(page, '第 2 条')
    await page.waitForTimeout(600)
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })

  test('深色主题视觉验收', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lingsu.theme', 'dark'))
    await agreeAndGoHome(page)
    await openClause(page, 'SHL.SB.TYS.012', '12')
    await page.screenshot({ path: 'test-results/swipe-artifacts/clause-mobile-dark.png' })
  })
})

test.describe('条文详情桌面端视觉验收', () => {
  test('桌面浅色截图', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('lingsu.theme', 'light'))
    await agreeAndGoHome(page)
    await openClause(page, 'SHL.SB.TYS.012', '12')
    await page.screenshot({ path: 'test-results/swipe-artifacts/clause-desktop-light.png' })
  })
})

/** 纵向触摸拖动（手指上滑 = 内容下滚） */
async function touchSwipeVertical(
  page: Page,
  from: { x: number; y: number },
  dy: number,
  steps = 8
) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from.x, y: from.y }],
  })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x, y: from.y + (dy * i) / steps }],
    })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}
