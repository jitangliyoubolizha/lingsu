import { useRouter } from 'vue-router'

/**
 * 返回上一页；没有历史记录时回退到指定路径。
 *
 * @param fallback 无历史记录时的回退路径，默认首页
 * @returns goBack 方法
 */
export function useRouterBack(fallback = '/') {
  const router = useRouter()

  function goBack() {
    if (router.options.history.state.back) {
      router.back()
    } else {
      void router.push(fallback)
    }
  }

  return { goBack }
}
