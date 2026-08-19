<script setup lang="ts">
import { useRoute } from 'vue-router'

import AppNav from './ui/components/AppNav.vue'
import GlobalNoticeBar from './ui/components/GlobalNoticeBar.vue'

const route = useRoute()
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
