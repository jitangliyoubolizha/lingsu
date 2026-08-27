/**
 * 底部合规提示条的收纳策略。
 *
 * 默认常驻；用户点 ✕ 收起后静默 NOTICE_TTL_DAYS 天，期间不再打扰，
 * 期满自动恢复展示。条文详情/搜索页由自带横幅负责，不受本条影响。
 * 状态记录于 IndexedDB settings 表，随设备本地保存。
 */
import { onMounted, ref } from 'vue'

import { getSetting, setSetting } from '../../store/settings'

/** 收起后的静默天数。 */
export const NOTICE_TTL_DAYS = 7

const DISMISS_KEY = 'noticeDismissedAt'

export function isNoticeVisible(
  dismissedAt: number | null | undefined,
  now: number,
  ttlDays: number = NOTICE_TTL_DAYS
): boolean {
  if (!dismissedAt) return true
  return now - dismissedAt >= ttlDays * 24 * 60 * 60 * 1000
}

export function useNoticeBar(): {
  visible: ReturnType<typeof ref<boolean>>
  dismiss: () => Promise<void>
} {
  const visible = ref(true)

  onMounted(async () => {
    try {
      const dismissedAt = await getSetting<number | null>(DISMISS_KEY, null)
      if (!isNoticeVisible(dismissedAt, Date.now())) visible.value = false
    } catch {
      // 读取失败按显示处理，保守取向
    }
  })

  async function dismiss(): Promise<void> {
    visible.value = false
    try {
      await setSetting(DISMISS_KEY, Date.now())
    } catch {
      // 写失败仅影响下次记忆，本次界面已收起
    }
  }

  return { visible, dismiss }
}
