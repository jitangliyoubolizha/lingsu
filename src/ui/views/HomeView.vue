<script setup lang="ts">
const appName = '灵素'
const description = '中医经典学习工具 · 当前以《伤寒论》为起点'
</script>

<template>
  <main class="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 class="text-4xl font-bold text-[--color-primary]">
      {{ appName }}
    </h1>
    <p class="text-base text-[--color-text-muted]">
      {{ description }}
    </p>
    <p class="text-sm text-[--color-text-muted]">
      工程骨架已初始化，等待子计划 4 开发页面。
    </p>
  </main>
</template>
