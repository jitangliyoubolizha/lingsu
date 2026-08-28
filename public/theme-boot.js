/*!
 * 主题防闪烁引导：在应用包加载前同步读取用户主题偏好并给 <html> 打类。
 * 主题属设备即时偏好，存 localStorage（见 src/ui/composables/useTheme.ts）。
 */
;(function () {
  try {
    var mode = localStorage.getItem('lingsu.theme')
    var dark =
      mode === 'dark' ||
      ((!mode || mode === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (dark) document.documentElement.classList.add('dark')
  } catch (e) {
    /* 无存储环境按浅色处理 */
  }
})()
