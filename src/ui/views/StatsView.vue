<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
import ProgressBar from '../components/ProgressBar.vue'
import StatCard from '../components/StatCard.vue'
import { dailyStats } from '../mockData'

const heatDays = [
  { label: '一', value: 3 },
  { label: '二', value: 2 },
  { label: '三', value: 0 },
  { label: '四', value: 4 },
  { label: '五', value: 1 },
  { label: '六', value: 0 },
  { label: '日', value: 0 },
]

const trend = [52, 58, 55, 64, 70, 66, 74]
const weekLabels = ['第 1 周', '第 7 周']

function heatClass(value: number) {
  if (value === 0) return 'bg-[#F1EAD9]'
  if (value === 1) return 'bg-[#EFD3C8]'
  if (value === 2) return 'bg-[#D99A8C]'
  if (value === 3) return 'bg-[#C66A5E]'
  return 'bg-cinnabar'
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <AppHeader
      title="统计"
      show-back
      back-to="/"
    />

    <section class="grid grid-cols-2 gap-3">
      <StatCard
        label="连续打卡"
        :value="dailyStats.streakDays"
        unit="天"
        tone="cinnabar"
      />
      <StatCard
        label="累计学习"
        :value="dailyStats.totalLearned"
        unit="条"
        tone="cinnabar"
      />
    </section>

    <section
      class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <h2 class="mb-4 font-serif text-base font-bold">
        学习日历
      </h2>
      <div
        class="grid grid-cols-7 gap-2"
        aria-label="最近一周打卡热力图"
      >
        <div
          v-for="day in heatDays"
          :key="day.label"
          class="flex flex-col items-center gap-1"
        >
          <div
            class="h-9 w-full rounded-md"
            :class="heatClass(day.value)"
            :aria-label="`周${day.label}强度${day.value}`"
          />
          <span class="text-[10px] text-ink-muted">{{ day.label }}</span>
        </div>
      </div>
      <div class="mt-3 flex items-center gap-1 text-[10px] text-ink-muted">
        <span>少</span>
        <span class="h-3 w-3 rounded-sm bg-[#F1EAD9]" />
        <span class="h-3 w-3 rounded-sm bg-[#EFD3C8]" />
        <span class="h-3 w-3 rounded-sm bg-[#D99A8C]" />
        <span class="h-3 w-3 rounded-sm bg-[#C66A5E]" />
        <span class="h-3 w-3 rounded-sm bg-cinnabar" />
        <span>多</span>
      </div>
    </section>

    <section class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
      <StatCard
        label="已掌握"
        :value="dailyStats.mastered"
        unit="条"
      />
      <StatCard
        label="学习中"
        :value="dailyStats.learning"
        unit="条"
      />
      <StatCard
        label="待复习"
        :value="dailyStats.dueReviews"
        unit="条"
      />
      <StatCard
        label="已收藏"
        :value="dailyStats.favorites"
        unit="条"
      />
      <StatCard
        label="正确率"
        :value="dailyStats.accuracy"
        unit="%"
      />
      <StatCard
        label="记忆保持率"
        :value="dailyStats.retention"
        unit="%"
      />
    </section>

    <section
      class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <h2 class="mb-4 font-serif text-base font-bold">
        篇章进度
      </h2>
      <div class="space-y-4">
        <div
          v-for="item in dailyStats.chapterProgress"
          :key="item.name"
        >
          <div class="mb-1 flex items-center justify-between text-sm">
            <span class="font-serif text-ink">{{ item.name }}</span>
            <span class="text-xs text-ink-muted">{{ item.done }}/{{ item.total }} ·
              {{ Math.round((item.done / item.total) * 100) }}%</span>
          </div>
          <ProgressBar :value="(item.done / item.total) * 100" />
        </div>
      </div>
    </section>

    <section
      class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <h2 class="mb-4 font-serif text-base font-bold">
        记忆保持率趋势
      </h2>
      <div
        class="flex h-32 items-end gap-2"
        aria-label="记忆保持率柱状图"
      >
        <div
          v-for="(value, index) in trend"
          :key="index"
          class="flex-1 rounded-t-md"
          :class="index === trend.length - 1 ? 'bg-cinnabar' : 'bg-cinnabar/50'"
          :style="{ height: `${value}%` }"
          :aria-label="`第${index + 1}周 ${value}%`"
        />
      </div>
      <div class="mt-2 flex justify-between text-xs text-ink-muted">
        <span>{{ weekLabels[0] }}</span>
        <span>{{ weekLabels[1] }}</span>
      </div>
    </section>
  </div>
</template>
