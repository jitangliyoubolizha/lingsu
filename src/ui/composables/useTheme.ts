/**
 * 主题模式（浅色 / 深色 / 跟随系统）。
 *
 * 持久化采用 localStorage 而非 IndexedDB：主题是设备即时偏好，
 * 必须在首帧渲染前同步读取（配合 public/theme-boot.js 防闪烁），
 * 也不属于需要随学习数据备份的内容。
 */
import { ref, watch } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const LS_KEY = 'lingsu.theme'
const MODES: ThemeMode[] = ['light', 'dark', 'system']

/** 模块级单例：App 与设置页共享同一份状态。 */
const mode = ref<ThemeMode>(readStoredModeSafe())

export function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw && (MODES as string[]).includes(raw) ? (raw as ThemeMode) : 'system'
  } catch {
    return 'system'
  }
}

function readStoredModeSafe(): ThemeMode {
  return readStoredMode()
}

export function setStoredMode(value: ThemeMode): void {
  try {
    localStorage.setItem(LS_KEY, value)
  } catch {
    // 写失败仅影响记忆，本次会话仍生效
  }
}

/** system 模式下依据系统偏好解析为实际主题。 */
export function resolveEffective(modeValue: ThemeMode, prefersDark: boolean): ThemeMode {
  if (modeValue === 'system') return prefersDark ? 'dark' : 'light'
  return modeValue
}

/** 将解析后的主题应用到 <html> 根元素，并同步 theme-color（iOS 状态栏/主屏幕区域取此值）。 */
export function applyTheme(modeValue: ThemeMode): void {
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const effective = resolveEffective(modeValue, prefersDark)
  document.documentElement.classList.toggle('dark', effective === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', effective === 'dark' ? '#17130f' : '#f5efe2')
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/**
 * 主题组合式函数。
 * 在 App.vue 挂载时调用以应用初始主题并监听系统变化；
 * 设置页调用 setMode 切换，状态全局共享。
 */
export function useTheme(): {
  mode: typeof mode
  setMode: (value: ThemeMode) => void
} {
  // 首次调用时先把持久化模式刷到 DOM（防其它入口先于 boot 脚本加载的兜底）
  applyTheme(mode.value)

  watch(mode, (value) => applyTheme(value))

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (mode.value === 'system') applyTheme('system')
      })
  }

  function setMode(value: ThemeMode): void {
    mode.value = value
    setStoredMode(value)
    applyTheme(value)
  }

  return { mode, setMode }
}

/** 供设置页展示当前模式（含 system 的实际效果）。 */
export function currentEffectiveTheme(): ThemeMode {
  return resolveEffective(mode.value, systemPrefersDark())
}
