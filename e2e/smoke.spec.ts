/**
 * E2E 冒烟测试 — 三条关键链路（TD-5）
 *
 * 链路 1: 协议 → 背诵  (agree → study)
 * 链路 2: 搜索 → 条文  (search → clause detail)
 * 链路 3: 刷题 → 错题本 (quiz → wrong book)
 */
import { expect, test, type Page } from '@playwright/test'

/**
 * 辅助：同意协议并进入首页。
 * 每个测试开头都需要，因为 IndexedDB 初始为空，路由守卫会重定向到 #/agreement。
 */
async function agreeAndGoHome(page: Page) {
  await page.goto('/')
  await page.waitForURL('**/#/agreement')
  await page.locator('input[type="checkbox"]').check()
  await page.locator('button:has-text("同意并开始学习")').click()
  await page.waitForURL('**/#/')
}

test.describe('E2E 冒烟测试', () => {
  test('链路 1: 协议 → 首页 → 背诵', async ({ page }) => {
    await agreeAndGoHome(page)

    // 首页应显示"今日任务"入口
    await expect(page.locator('text=今日任务').first()).toBeVisible({ timeout: 8000 })

    // 点击"开始背诵"
    await page.locator('text=开始背诵').first().click()
    await page.waitForURL('**/#/study')

    // 背诵页应进入学习流程：出现"学会了"或条文内容
    // 默认计划有 3 条新条文，应出现"学会了，进入下一项"按钮
    await expect(page.locator('text=学会了，进入下一项').first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('链路 2: 搜索 → 条文详情', async ({ page }) => {
    await agreeAndGoHome(page)

    // 导航到搜索页
    await page.goto('/#/search')
    await page.waitForURL('**/#/search')

    // 输入搜索词并按回车触发提交
    const searchInput = page.locator('input[type="search"]').first()
    await expect(searchInput).toBeVisible({ timeout: 8000 })

    // 内容索引异步加载，轮询直到出现真实"条文（N）"结果
    const clauseResult = page.locator('text=/条文（\\d+）/').first()
    for (let i = 0; i < 10; i++) {
      await searchInput.fill('桂枝')
      await searchInput.press('Enter')
      if (await clauseResult.isVisible().catch(() => false)) break
      await page.waitForTimeout(1000)
    }
    await expect(clauseResult).toBeVisible({ timeout: 10000 })

    // 点击第一个条文结果（跳到条文详情）
    await page.locator('a[href^="#/clauses/"]').first().click()
    await page.waitForURL('**/#/clauses/**')

    // 条文详情页应出现"白话译文"区块
    await expect(page.locator('text=白话译文').first()).toBeVisible({ timeout: 8000 })
  })

  test('链路 3: 刷题 → 错题本', async ({ page }) => {
    await agreeAndGoHome(page)

    // 导航到刷题页（默认进入模式选择）
    await page.goto('/#/quiz')
    await page.waitForURL('**/#/quiz')

    // 点击"随机综合"进入刷题
    await page.locator('button:has-text("随机综合")').click({ timeout: 8000 })

    // 应出现题目：单选按钮 A/B/C 与"提交答案"
    await expect(page.locator('button:has-text("提交答案")').first()).toBeVisible({
      timeout: 10000,
    })

    // 选一个选项并提交（无论对错，链路都成立）
    const opts = page.locator('span:has-text("A")')
    if ((await opts.count()) > 0) {
      await opts.first().click()
    }
    await page.locator('button:has-text("提交答案")').first().click()
    await page.waitForTimeout(500)

    // 进入错题本
    await page.goto('/#/wrong-book')
    await page.waitForURL('**/#/wrong-book')

    // 错题本应渲染"待巩固"标题（空态或台账均含该字样）
    await expect(page.locator('text=待巩固').first()).toBeVisible({ timeout: 8000 })
  })
})