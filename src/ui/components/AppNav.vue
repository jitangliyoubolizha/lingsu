<script setup lang="ts">
import { ChartColumn, FileText, House, User } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const items = [
  { name: 'home', label: '首页', to: '/', icon: House },
  { name: 'quiz', label: '刷题', to: '/quiz', icon: FileText },
  { name: 'stats', label: '统计', to: '/stats', icon: ChartColumn },
  { name: 'profile', label: '我的', to: '/profile', icon: User },
]

const activeName = computed(() => {
  const matched = route.matched.find((record) => record.meta?.navKey)
  return matched?.meta.navKey as string | undefined
})

const isBare = computed(() => Boolean(route.meta.bare))
</script>

<template>
  <!-- 手机 / 平板底部导航 -->
  <nav
    v-if="!isBare"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-border-paper bg-paper-card shadow-[0_-4px_12px_rgba(34,26,16,.06)] lg:hidden"
    aria-label="主导航"
  >
    <div
      class="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors"
        :class="activeName === item.name ? 'font-semibold text-cinnabar' : 'text-ink-muted'"
      >
        <component
          :is="item.icon"
          class="h-[22px] w-[22px]"
          :stroke-width="activeName === item.name ? 2 : 1.8"
          aria-hidden="true"
        />
        <span>{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>

  <!-- 桌面左侧导航 -->
  <aside
    v-if="!isBare"
    class="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border-paper bg-paper-card lg:flex"
    aria-label="桌面导航"
  >
    <div class="flex items-center gap-2.5 px-5 py-5">
      <span
        class="flex h-10 w-10 items-center justify-center rounded-md bg-cinnabar font-serif text-xl font-bold text-white shadow-[0_4px_10px_rgba(110,0,0,.15)]"
        aria-hidden="true"
      >
        灵
      </span>
      <div>
        <p class="font-serif text-base font-bold leading-tight">
          灵素
        </p>
        <p class="text-xs text-ink-muted">
          伤寒学习
        </p>
      </div>
    </div>
    <nav class="flex-1 space-y-1 px-3">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.to"
        class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
        :class="
          activeName === item.name
            ? 'bg-cinnabar-soft text-cinnabar'
            : 'text-ink-secondary hover:bg-paper-deep hover:text-ink'
        "
      >
        <component
          :is="item.icon"
          class="h-5 w-5"
          :stroke-width="activeName === item.name ? 2 : 1.8"
          aria-hidden="true"
        />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    <p class="px-5 py-4 text-xs text-ink-muted">
      灵素 · v0.1.0
    </p>
  </aside>
</template>
