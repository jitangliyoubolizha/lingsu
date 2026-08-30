import { createApp } from 'vue'

import App from './App.vue'
import router from './ui/router'
import './style.css'

/**
 * 帧冻结环境兜底：内嵌预览窗格等环境下 requestAnimationFrame 永不触发，
 * Vue Transition 依赖 rAF 的类切换会永久卡住（点返回/切 tab 画面停在旧页）。
 * 启动时探测 120ms 内 rAF 是否触发，未触发则降级为 setTimeout 驱动；
 * 正常浏览器 rAF 存活，本兜底不生效。
 */
;(function ensureAliveFrame() {
  let rafAlive = false
  const timer = setTimeout(() => {
    if (rafAlive) return
    window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(performance.now()), 16)) as unknown as typeof requestAnimationFrame
    window.cancelAnimationFrame = ((id: number) =>
      clearTimeout(id)) as unknown as typeof cancelAnimationFrame
  }, 120)
  requestAnimationFrame(() => {
    rafAlive = true
    clearTimeout(timer)
  })
})()

createApp(App).use(router).mount('#app')
