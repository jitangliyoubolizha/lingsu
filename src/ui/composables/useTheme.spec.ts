// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  applyTheme,
  readStoredMode,
  resolveEffective,
  setStoredMode,
  type ThemeMode,
} from './useTheme'

const LS_KEY = 'lingsu.theme'

function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<() => void>()
  const mql = {
    matches: prefersDark,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    __emit: () => listeners.forEach((cb) => cb()),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => mql))
  return mql
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  vi.unstubAllGlobals()
})

describe('主题模式', () => {
  it('resolveEffective：system 依赖系统偏好，light/dark 直接生效', () => {
    expect(resolveEffective('system', false)).toBe('light')
    expect(resolveEffective('system', true)).toBe('dark')
    expect(resolveEffective('light', true)).toBe('light')
    expect(resolveEffective('dark', false)).toBe('dark')
  })

  it('applyTheme：dark 加 html.dark 类，light/system(浅) 移除', () => {
    stubMatchMedia(false)
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    applyTheme('system')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('applyTheme：system 模式且系统深色时应用 dark', () => {
    stubMatchMedia(true)
    applyTheme('system')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('持久化：未存储时默认 system；setStoredMode 写入后 readStoredMode 读回', () => {
    stubMatchMedia(false)
    expect(readStoredMode()).toBe<ThemeMode>('system')
    setStoredMode('dark')
    expect(localStorage.getItem(LS_KEY)).toBe('dark')
    expect(readStoredMode()).toBe('dark')
  })

  it('持久化脏数据时回退 system 而不是抛错', () => {
    stubMatchMedia(false)
    localStorage.setItem(LS_KEY, 'blooper')
    expect(readStoredMode()).toBe('system')
  })
})
