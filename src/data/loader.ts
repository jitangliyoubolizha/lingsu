import type { ContentData } from './types'
import generated from './generated/content.json'

let cached: ContentData | undefined

/**
 * 加载构建后的内容数据。
 * @returns 内容数据对象
 */
export function loadContent(): ContentData {
  if (!cached) {
    cached = generated as ContentData
  }
  return cached
}
