import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8')
const sheet = readFileSync(
  new URL('../src/ui/components/ProfileSettingsSheet.vue', import.meta.url),
  'utf8'
)
const quiz = readFileSync(new URL('../src/ui/views/QuizView.vue', import.meta.url), 'utf8')
const studyTask = readFileSync(
  new URL('../src/ui/views/StudyTaskView.vue', import.meta.url),
  'utf8'
)

/* ---------- 工具：按选择器截取 CSS 块 ---------- */

function blockOf(pattern: RegExp, label: string): string {
  const match = pattern.exec(css)
  if (!match) throw new Error(`CSS 中找不到 ${label}`)
  return match[1]!
}

describe('motion 动效令牌与基础类（E-14）', () => {
  it('@theme 定义缓动令牌，供 ease-* 工具类与自定义动画 var() 引用', () => {
    expect(css).toContain('--ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1)')
    expect(css).toContain('--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)')
  })

  it('页面转场：入场轻浮上滑、退场纯淡出，不得回退为整页旋转', () => {
    const enterActive = blockOf(/\.page-enter-active\s*\{([^}]*)\}/, '.page-enter-active')
    const enterFrom = blockOf(/\.page-enter-from\s*\{([^}]*)\}/, '.page-enter-from')
    const leaveTo = blockOf(/\.page-leave-to\s*\{([^}]*)\}/, '.page-leave-to')
    expect(enterActive).toContain('--ease-out-soft')
    expect(enterFrom).toContain('translateY')
    expect(`${enterFrom}${leaveTo}`).not.toContain('rotate')
  })

  it('列表编舞：stagger 入场类存在，错峰延迟 2~8 项逐级递增', () => {
    expect(css).toContain('.stagger-enter-from')
    const delays = [
      ...css.matchAll(/\.stagger-enter-active:nth-child\((\d)\)/g),
    ].map((m) => Number(m[1]))
    expect(delays).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('答题微反馈：摇头与轻弹关键帧已定义', () => {
    expect(css).toContain('@keyframes shake-x')
    expect(css).toContain('@keyframes pop-in')
    expect(css).toContain('.animate-shake-x')
    expect(css).toContain('.animate-pop-in')
  })

  it('按压反馈：pressable 按下缩放 0.98', () => {
    const active = blockOf(/\.pressable:active\s*\{([^}]*)\}/, '.pressable:active')
    expect(active).toContain('scale(0.98)')
  })

  it('设置弹层：Transition 包裹，遮罩淡入、面板自下滑入', () => {
    expect(sheet).toContain('name="sheet"')
    expect(sheet).toContain('sheet-backdrop')
    expect(sheet).toContain('sheet-panel')
    const enterFrom = blockOf(
      /\.sheet-enter-from \.sheet-panel\s*\{([^}]*)\}/,
      '.sheet-enter-from .sheet-panel'
    )
    expect(enterFrom).toContain('translateY')
  })

  it('刷题与错题巩固：选项列表接入编舞且逐题重触发', () => {
    for (const source of [quiz, studyTask]) {
      expect(source).toContain('name="stagger"')
      expect(source).toContain('appear')
      expect(source).toContain('pressable')
      /* key 携带题目序号，切题时重新入场而非复用旧元素 */
      expect(source).toMatch(/:key="`\$\{currentIndex\}-\$\{index\}`"/)
    }
  })

  it('减少动效：全局兜底覆盖动画与过渡（规范 §4.3）', () => {
    const media = blockOf(
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
      'prefers-reduced-motion 块'
    )
    expect(media).toContain('animation-duration: 0.01ms')
    expect(media).toContain('transition-duration: 0.01ms')
  })
})
