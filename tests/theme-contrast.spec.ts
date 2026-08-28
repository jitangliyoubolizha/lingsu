import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')

/* ---------- 工具：解析 CSS 变量与 WCAG 对比度 ---------- */

function extractBlock(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm')
  const match = re.exec(source)
  if (!match) throw new Error(`CSS 中找不到选择器 ${selector}`)
  return match[1]!
}

function tokensOf(block: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const m of block.matchAll(/--color-([a-z-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    map[m[1]!] = m[2]!
  }
  return map
}

function luminance(hex: string): number {
  const n = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2)!, 16) / 255)
  const lin = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!
}

/** WCAG 对比度（(L1+0.05)/(L2+0.05)，≥4.5 为正文 AA） */
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

/* ---------- 断言集 ---------- */

const TEXT_ON_CARD: Array<[string, string]> = [
  ['ink', '正文'],
  ['ink-secondary', '次级文本'],
  ['ink-muted', '弱化文本'],
  ['cinnabar', '朱砂强调（链接/按钮文字）'],
  ['indigo', '靛青强调（链接）'],
  ['green', '绿色强调（图谱药色标签）'],
]

const rootTokens = tokensOf(extractBlock(css, '@theme'))
const darkTokens = tokensOf(extractBlock(css, 'html.dark'))

describe('设计 token 对比度门禁（WCAG AA 正文 4.5:1）', () => {
  it('浅色主题：纸面/卡片上的正文与强调色全部达标', () => {
    for (const [name, label] of TEXT_ON_CARD) {
      const fg = rootTokens[name!]
      expect(fg, `浅色主题缺少 --color-${name}`).toBeTruthy()
      expect(
        contrast(fg!, rootTokens['paper-card']!),
        `浅色 ${label}(${fg}) 于 paper-card(${rootTokens['paper-card']})`
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('深色主题（宣纸暗夜）：暗色卡面上的正文与强调色全部达标', () => {
    for (const key of ['paper', 'paper-card', 'paper-deep', 'border-paper', 'ink', 'ink-secondary', 'ink-muted', 'cinnabar', 'indigo', 'green']) {
      expect(darkTokens[key!], `html.dark 缺少 --color-${key} 覆盖`).toBeTruthy()
    }
    for (const [name, label] of TEXT_ON_CARD) {
      const fg = darkTokens[name!]
      expect(
        contrast(fg!, darkTokens['paper-card']!),
        `深色 ${label}(${fg}) 于 paper-card(${darkTokens['paper-card']})`
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('两主题主背景上的正文均达标（paper 底）', () => {
    expect(contrast(rootTokens['ink']!, rootTokens['paper']!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(darkTokens['ink']!, darkTokens['paper']!)).toBeGreaterThanOrEqual(4.5)
  })
})
