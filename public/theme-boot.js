/*!
 * 主题防闪烁引导：在应用包加载前同步读取用户主题偏好并给 <html> 打类。
 * 主题属设备即时偏好，存 localStorage（见 src/ui/composables/useTheme.ts）。
 * 同时同步 theme-color meta：iOS 主屏幕/状态栏区域取此值，
 * 应用内深色≠系统深色，媒体查询无法覆盖，必须按存储的偏好写。
 */
;(function () {
  try {
    var mode = localStorage.getItem('lingsu.theme')
    var dark =
      mode === 'dark' ||
      ((!mode || mode === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#17130f' : '#f5efe2')
  } catch (e) {
    /* 无存储环境按浅色处理 */
  }
})()
