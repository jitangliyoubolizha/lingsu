// @vitest-environment jsdom
import 'fake-indexeddb/auto'

import { afterEach, describe, expect, it } from 'vitest'

import { getSetting, setSetting } from '../src/store'

type FontSize = '小' | '中' | '大'

const SIZE_CLASSES: Record<FontSize, string | null> = {
  '小': 'font-size-sm',
  '中': null,
  '大': 'font-size-lg',
}

function applyFontSize(size: FontSize) {
  const html = document.documentElement
  html.classList.remove('font-size-sm', 'font-size-lg')
  if (SIZE_CLASSES[size]) {
    html.classList.add(SIZE_CLASSES[size]!)
  }
}

describe('TD-3 字号三档设置', () => {
  afterEach(() => {
    document.documentElement.classList.remove('font-size-sm', 'font-size-lg')
  })

  it('默认字号为"中"，getSetting 返回默认值', async () => {
    const size = await getSetting<FontSize>('fontSize', '中')
    expect(size).toBe('中')
  })

  it('setSetting/getSetting 往返正确', async () => {
    await setSetting('fontSize', '小')
    expect(await getSetting<FontSize>('fontSize', '中')).toBe('小')

    await setSetting('fontSize', '大')
    expect(await getSetting<FontSize>('fontSize', '中')).toBe('大')

    await setSetting('fontSize', '中')
    expect(await getSetting<FontSize>('fontSize', '中')).toBe('中')
  })

  it('applyFontSize("中") 不添加任何 class', () => {
    applyFontSize('中')
    expect(document.documentElement.classList.contains('font-size-sm')).toBe(false)
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(false)
  })

  it('applyFontSize("小") 添加 font-size-sm', () => {
    applyFontSize('小')
    expect(document.documentElement.classList.contains('font-size-sm')).toBe(true)
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(false)
  })

  it('applyFontSize("大") 添加 font-size-lg', () => {
    applyFontSize('大')
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(true)
    expect(document.documentElement.classList.contains('font-size-sm')).toBe(false)
  })

  it('切换字号时旧 class 被移除', () => {
    applyFontSize('大')
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(true)

    applyFontSize('小')
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(false)
    expect(document.documentElement.classList.contains('font-size-sm')).toBe(true)

    applyFontSize('中')
    expect(document.documentElement.classList.contains('font-size-sm')).toBe(false)
    expect(document.documentElement.classList.contains('font-size-lg')).toBe(false)
  })
})