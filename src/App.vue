<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AppNav from './ui/components/AppNav.vue'
import ComplianceBanner from './ui/components/ComplianceBanner.vue'
import GlobalNoticeBar from './ui/components/GlobalNoticeBar.vue'
import { useFontSize } from './ui/composables/useFontSize'
import { useTheme } from './ui/composables/useTheme'
import { clauseNavDirection } from './ui/composables/useSwipeNavigate'

const route = useRoute()

// 条文横滑翻条：整页滑动交接（pager）已在组件内完成滑动，换页走 page-instant 瞬时无过渡；
// 键盘/底部链接走方向性滑入（next/prev，两页并行）；其余路由走默认页面转场（out-in 串行让位）。
// 方向只在导航起点写入、转场期间保持不变（转场结束后残留值对其他路由无影响），
// 从非条文页进入详情时在导航起点清掉上一次翻页的残留方向
const pageTransition = computed(() => {
  if (route.name === 'clause-detail' && clauseNavDirection.value) {
    if (clauseNavDirection.value === 'pager') return 'page-instant'
    return clauseNavDirection.value === 'next' ? 'page-next' : 'page-prev'
  }
  if (tabDirection.value) {
    return tabDirection.value === 'next' ? 'page-next' : 'page-prev'
  }
  return 'page'
})

const pageTransitionMode = computed(() =>
  pageTransition.value === 'page' ? 'out-in' : undefined
)

watch(
  () => route.name,
  (to, from) => {
    if (to === 'clause-detail' && from !== 'clause-detail') {
      clauseNavDirection.value = null
    }
  }
)

// 底部主 tab（首页/刷题/统计/我的）之间切换：按 tab 左右顺序做方向性滑动，强化位置反馈
const TAB_ORDER = ['home', 'quiz', 'stats', 'profile']
const tabDirection = ref<'next' | 'prev' | null>(null)

watch(
  () => route.meta?.navKey,
  (to, from) => {
    const toIndex = TAB_ORDER.indexOf(String(to ?? ''))
    const fromIndex = TAB_ORDER.indexOf(String(from ?? ''))
    if (toIndex >= 0 && fromIndex >= 0 && toIndex !== fromIndex) {
      tabDirection.value = toIndex > fromIndex ? 'next' : 'prev'
    } else {
      tabDirection.value = null
    }
  }
)

// 页面自带合规横幅（条文详情/搜索页）的样式：搜索页浅色、条文详情朱砂红
const compliance = computed(() => {
  if (route.name === 'search') {
    return { tone: 'muted' as const, text: '仅供学习研究，不构成医疗建议' }
  }
  if (route.name === 'clause-detail') {
    return { tone: 'cinnabar' as const, text: '仅供学习研究，不构成医疗建议，请勿自行用药' }
  }
  return null
})

// 应用字号三档设置到 <html> 根元素
useFontSize()

// 应用主题模式（浅色/深色/跟随系统），并监听系统偏好变化
useTheme()
</script>

<template>
  <!-- 协议页：无导航、全屏居中 -->
  <div
    v-if="route.meta.bare"
    class="min-h-screen bg-paper"
  >
    <RouterView />
  </div>

  <!-- 应用主布局：手机底部导航 / 桌面左侧导航 -->
  <div
    v-else
    class="min-h-screen bg-paper lg:pl-56"
  >
    <AppNav />
    <GlobalNoticeBar
      v-if="!route.meta.bare && !route.meta.ownComplianceBanner"
      :lifted="Boolean(route.meta.bottomNav)"
    />
    <ComplianceBanner
      v-if="compliance"
      :tone="compliance.tone"
      :text="compliance.text"
      show-feedback
    />
    <main
      class="relative mx-auto w-full max-w-5xl overflow-x-clip px-5"
      :class="route.meta.bottomNav ? 'pb-28 pt-2 lg:pb-24' : 'pb-24 pt-2'"
    >
      <RouterView v-slot="{ Component }">
        <Transition
          :name="pageTransition"
          :mode="pageTransitionMode"
        >
          <component
            :is="Component"
            :key="route.fullPath"
          />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>
