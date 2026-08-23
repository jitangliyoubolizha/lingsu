import { onMounted } from 'vue'
import { getSetting, setSetting } from '../../store'

export type FontSize = '小' | '中' | '大'

const SIZE_CLASSES: Record<FontSize, string | null> = {
  '小': 'font-size-sm',
  '中': null,
  '大': 'font-size-lg',
}

/**
 * 字号三档设置 composable。
 * 在 App.vue 挂载时调用，读取持久化设置并应用到 <html> 根元素。
 * 所有 rem 单位将自动按比例缩放。
 */
export function useFontSize() {
  async function apply() {
    const size = await getSetting<FontSize>('fontSize', '中')
    const html = document.documentElement
    html.classList.remove('font-size-sm', 'font-size-lg')
    if (SIZE_CLASSES[size]) {
      html.classList.add(SIZE_CLASSES[size]!)
    }
  }

  async function changeFontSize(size: FontSize) {
    await setSetting('fontSize', size)
    await apply()
  }

  onMounted(apply)

  return { changeFontSize, apply }
}