<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppNav from './ui/components/AppNav.vue'
import ComplianceBanner from './ui/components/ComplianceBanner.vue'
import GlobalNoticeBar from './ui/components/GlobalNoticeBar.vue'
import { useFontSize } from './ui/composables/useFontSize'

const route = useRoute()

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
      class="mx-auto w-full max-w-5xl px-5"
      :class="route.meta.bottomNav ? 'pb-28 pt-2 lg:pb-24' : 'pb-24 pt-2'"
    >
      <RouterView v-slot="{ Component }">
        <Transition
          name="page"
          mode="out-in"
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
