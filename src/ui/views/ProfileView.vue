<script setup lang="ts">
import {
  BookOpen,
  ChevronRight,
  Download,
  FileX,
  MessageCircle,
  Pause,
  Play,
  Plus,
  Settings,
  Star,
  Trash2,
  Upload,
  User,
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

import { loadMeta } from '../../data'
import type { StudyPlan } from '../../domain/memory'
import {
  createStudyPlan,
  deleteStudyPlan,
  exportData,
  getActivePlanCount,
  getClauseStates,
  getAllStudyPlans,
  getSetting,
  importData,
  MAX_ACTIVE_PLANS,
  serializeBackup,
  setSetting,
  togglePlanStatus,
} from '../../store'
import { useTheme } from '../composables/useTheme'
import type { ThemeMode } from '../composables/useTheme'
import AppHeader from '../components/AppHeader.vue'
import ProfileSettingsSheet from '../components/ProfileSettingsSheet.vue'
import ProgressBar from '../components/ProgressBar.vue'
import TagPill from '../components/TagPill.vue'

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]
const { mode: themeMode, setMode } = useTheme()

const progress = ref(0)
const fileInput = ref<{ click: () => void } | null>(null)

/* —— 设置按钮弹层（字号/朗读/每日新学已收纳其中） —— */
const showSettings = ref(false)

// —— 学习计划管理 ——
const planChapters = loadMeta().chapters
const plans = ref<StudyPlan[]>([])
const activeCount = ref(0)
const showPlanForm = ref(false)
const newChapter = ref('')
const newDailyNew = ref<number>(5)
const planFormCustom = ref(false)
const planCustomInput = ref(6)
const canAddPlan = computed(() => activeCount.value < MAX_ACTIVE_PLANS)

const groups = [
  {
    title: '学习库',
    items: [
      { label: '我的收藏', icon: Star, to: '/favorites' },
      { label: '待巩固', icon: FileX, to: '/wrong-book' },
    ],
  },
  {
    title: '关于',
    items: [
      { label: '免责声明', icon: Settings, to: '/disclaimer' },
      { label: '意见反馈', icon: MessageCircle, to: '/feedback' },
      { label: '内容来源', icon: Settings, to: '/profile' },
    ],
  },
]

async function load() {
  // 进度百分比只需要条文总数，取元数据的篇章统计，不加载条文正文
  const totalClauses = loadMeta().chapters.reduce((sum, chapter) => sum + chapter.clauseCount, 0)
  const states = await getClauseStates()
  const learned = states.filter((state) => state.firstLearnedAt).length
  progress.value = totalClauses === 0 ? 0 : Math.round((learned / totalClauses) * 100)
  const storedDailyNew = await getSetting<number | undefined>('dailyNew', undefined)
  if (storedDailyNew === undefined) {
    // 首次使用：把默认任务量 5 条落库（备份/联动都用它）
    await setSetting('dailyNew', 5)
  }
  await loadPlans()
}

async function loadPlans() {
  const [all, count] = await Promise.all([getAllStudyPlans(), getActivePlanCount()])
  plans.value = all
  activeCount.value = count
}

async function togglePlan(plan: StudyPlan) {
  await togglePlanStatus(plan)
  await loadPlans()
}

async function removePlan(plan: StudyPlan) {
  await deleteStudyPlan(plan.id)
  await loadPlans()
}

function openPlanForm() {
  const used = new Set(plans.value.flatMap((plan) => plan.scope.chapters))
  const firstAvailable = planChapters.find((chapter) => !used.has(chapter.code))
  newChapter.value = firstAvailable?.code ?? planChapters[0]?.code ?? ''
  newDailyNew.value = 5
  planFormCustom.value = false
  planCustomInput.value = 6
  showPlanForm.value = true
}

function cancelPlan() {
  showPlanForm.value = false
}

async function submitPlan() {
  if (!newChapter.value) return
  const chapter = planChapters.find((item) => item.code === newChapter.value)
  await createStudyPlan({
    name: chapter?.name ?? newChapter.value,
    scope: { book: 'SHL', edition: 'SB', chapters: [newChapter.value] },
    dailyNew: planFormCustom.value ? planCustomInput.value : newDailyNew.value,
  })
  showPlanForm.value = false
  await loadPlans()
}

async function downloadBackup() {
  const backup = await exportData()
  const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `lingsu-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function onImportFile(event: Event) {
  const input = event.target as unknown as { files?: Array<{ text: () => Promise<string> }> | null }
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  await importData(text)
  await load()
  const element = event.target as unknown as { value?: string }
  element.value = ''
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <AppHeader title="我的">
      <template #actions>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
          aria-label="设置"
          @click="showSettings = true"
        >
          <Settings
            class="h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </template>
    </AppHeader>

    <ProfileSettingsSheet
      :open="showSettings"
      @close="showSettings = false"
      @changed="loadPlans"
    />

    <section
      class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-14 w-14 items-center justify-center rounded-full bg-paper-deep text-ink-muted"
        >
          <User
            class="h-7 w-7"
            aria-hidden="true"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-serif text-lg font-bold text-ink">
            本地学习者
          </p>
          <p class="text-xs text-ink-muted">
            未登录 · 数据仅保存在本机
          </p>
        </div>
      </div>
      <div class="mt-4">
        <div class="mb-1 flex justify-between text-xs text-ink-muted">
          <span>总体进度</span>
          <span>{{ progress }}%</span>
        </div>
        <ProgressBar :value="progress" />
      </div>
    </section>

    <section class="mt-4">
      <div class="mb-2 flex items-center justify-between px-2">
        <h2 class="text-xs font-semibold text-ink-muted">
          学习计划
        </h2>
        <button
          v-if="canAddPlan"
          type="button"
          class="flex items-center gap-1 text-xs font-medium text-cinnabar"
          @click="openPlanForm"
        >
          <Plus
            class="h-3.5 w-3.5"
            aria-hidden="true"
          />
          新增计划
        </button>
        <span
          v-else
          class="text-xs text-ink-muted"
        >
          最多同时进行 2 个计划
        </span>
      </div>

      <div class="overflow-hidden rounded-2xl border border-border-paper bg-paper-card shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <p
          v-if="plans.length === 0"
          class="px-4 py-8 text-center text-sm text-ink-muted"
        >
          暂无学习计划
        </p>
        <div
          v-else
          class="divide-y divide-border-paper"
        >
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <BookOpen
              class="h-5 w-5 shrink-0 text-ink-muted"
              aria-hidden="true"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-ink">
                {{ plan.name }}
              </p>
              <p class="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                <TagPill :tone="plan.status === 'active' ? 'cinnabar' : plan.status === 'paused' ? 'muted' : 'green'">
                  {{ plan.status === 'active' ? '进行中' : plan.status === 'paused' ? '已暂停' : '已完成' }}
                </TagPill>
                {{ plan.dailyNew }} 条/日
              </p>
            </div>
            <button
              type="button"
              class="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-ink-secondary hover:bg-paper-deep"
              :aria-label="plan.status === 'active' ? '暂停计划' : '激活计划'"
              @click="togglePlan(plan)"
            >
              <Pause
                v-if="plan.status === 'active'"
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
              <Play
                v-else
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
              <span>{{ plan.status === 'active' ? '暂停' : '激活' }}</span>
            </button>
            <button
              type="button"
              class="flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-cinnabar hover:bg-cinnabar-soft"
              aria-label="删除计划"
              @click="removePlan(plan)"
            >
              <Trash2
                class="h-3.5 w-3.5"
                aria-hidden="true"
              />
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showPlanForm"
        class="mt-3 rounded-2xl border border-border-paper bg-paper-card p-4"
      >
        <h3 class="mb-3 text-sm font-semibold text-ink-secondary">
          新增学习计划
        </h3>
        <label
          class="mb-1 block text-xs text-ink-muted"
          for="new-plan-chapter"
        >
          篇章
        </label>
        <select
          id="new-plan-chapter"
          v-model="newChapter"
          class="h-10 w-full rounded-lg border border-border-paper bg-paper-card px-2 text-sm text-ink"
        >
          <option
            v-for="chapter in planChapters"
            :key="chapter.code"
            :value="chapter.code"
          >
            {{ chapter.name }}
          </option>
        </select>
        <label class="mb-1 mt-3 block text-xs text-ink-muted">
          每日新学数量
        </label>
        <div class="flex gap-2">
          <button
            v-for="n in [3, 5, 10] as const"
            :key="n"
            type="button"
            class="h-9 flex-1 rounded-lg text-sm"
            :class="!planFormCustom && newDailyNew === n ? 'bg-cinnabar text-white' : 'bg-paper-deep text-ink-secondary'"
            @click="planFormCustom = false; newDailyNew = n"
          >
            {{ n }} 条/日
          </button>
          <button
            type="button"
            class="h-9 flex-1 rounded-lg text-sm"
            :class="planFormCustom ? 'bg-cinnabar text-white' : 'bg-paper-deep text-ink-secondary'"
            @click="planFormCustom = true"
          >
            自定义
          </button>
        </div>
        <div
          v-if="planFormCustom"
          class="mt-2 flex items-center justify-end gap-2 rounded-lg bg-paper-deep/60 p-2"
        >
          <label class="text-xs text-ink-muted">每日条数（1~20）</label>
          <input
            v-model.number="planCustomInput"
            type="number"
            min="1"
            max="20"
            aria-label="自定义每日条数"
            class="h-9 w-20 rounded-lg border border-border-paper bg-paper-card px-2 text-center text-sm text-ink focus:border-cinnabar/50 focus:outline-none"
          >
        </div>
        <div class="mt-4 flex gap-2">
          <button
            type="button"
            class="h-10 flex-1 rounded-xl bg-cinnabar text-sm font-semibold text-white hover:bg-cinnabar-deep disabled:opacity-50"
            :disabled="!newChapter"
            @click="submitPlan"
          >
            创建计划
          </button>
          <button
            type="button"
            class="h-10 flex-1 rounded-xl border border-border-paper bg-paper-card text-sm font-semibold text-ink-secondary hover:bg-paper-deep"
            @click="cancelPlan"
          >
            取消
          </button>
        </div>
      </div>
    </section>

    <section
      v-for="group in groups"
      :key="group.title"
      class="mt-4"
    >
      <h2 class="px-2 pb-2 text-xs font-semibold text-ink-muted">
        {{ group.title }}
      </h2>
      <div
        class="divide-y divide-border-paper rounded-2xl border border-border-paper bg-paper-card px-2 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <RouterLink
          v-for="item in group.items"
          :key="item.label"
          :to="item.to"
          class="flex min-h-12 items-center gap-3 px-2"
        >
          <component
            :is="item.icon"
            class="h-5 w-5 shrink-0 text-ink-muted"
            aria-hidden="true"
          />
          <span class="flex-1 text-[15px] text-ink">{{ item.label }}</span>
          <ChevronRight
            class="h-4 w-4 text-ink-muted"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
      <h2 class="mb-3 text-sm font-semibold text-ink-secondary">
        外观
      </h2>
      <div class="flex items-center justify-between">
        <span class="text-sm text-ink-secondary">外观主题</span>
        <div class="flex gap-1">
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            type="button"
            class="h-9 rounded-lg px-3 text-sm"
            :class="
              themeMode === option.value
                ? 'bg-cinnabar text-white'
                : 'bg-paper-deep text-ink-secondary'
            "
            :aria-pressed="themeMode === option.value"
            @click="setMode(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <section class="mt-4 rounded-2xl border border-border-paper bg-paper-card p-4">
      <h2 class="mb-3 text-sm font-semibold text-ink-secondary">
        数据管理
      </h2>
      <div class="space-y-2">
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          @click="downloadBackup"
        >
          <Download
            class="h-5 w-5 text-ink-muted"
            aria-hidden="true"
          />
          导出备份
        </button>
        <button
          type="button"
          class="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-[15px] text-ink hover:bg-paper-deep"
          @click="fileInput?.click()"
        >
          <Upload
            class="h-5 w-5 text-ink-muted"
            aria-hidden="true"
          />
          导入恢复
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onImportFile"
        >
      </div>
    </section>

    <p class="mt-6 text-center text-xs text-ink-muted">
      灵素 · 版本 v0.1.0
    </p>
  </div>
</template>
