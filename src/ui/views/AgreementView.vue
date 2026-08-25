<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { markAgreed } from '../../store'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const agreed = ref(false)

async function start() {
  if (agreed.value) {
    await markAgreed()
    void router.push('/')
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-paper">
    <main class="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
      <div class="mb-8 flex flex-col items-center text-center">
        <span
          class="flex h-16 w-16 items-center justify-center rounded-lg bg-cinnabar font-serif text-3xl font-bold text-white shadow-[0_8px_24px_rgba(110,0,0,.18)]"
          aria-label="灵素印章"
        >
          灵
        </span>
        <h1 class="mt-4 font-serif text-2xl font-bold text-ink">
          灵素 · 伤寒学习
        </h1>
        <p class="mt-1 text-sm text-ink-muted">
          中医经典学习工具 · 当前以《伤寒论》为起点
        </p>
      </div>

      <div
        class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]"
      >
        <h2 class="mb-3 text-center font-serif text-lg font-bold text-ink">
          用户协议与免责声明
        </h2>
        <div class="space-y-3 text-[13px] leading-relaxed text-ink-secondary">
          <p>本工具仅供学习研究使用，不构成医疗建议，不提供用药推荐。</p>
          <p>《伤寒论》为古代中医典籍，原文剂量属于古代度量衡，不可自行照方抓药。</p>
          <p>处方须由执业医师开具；身体不适应及时就医。</p>
          <p>条文可能存在错误，可点击底部『内容纠错』反馈。</p>
          <p>继续使用即表示你已阅读并同意《用户协议与免责声明》。</p>
        </div>
        <div class="mt-5 rounded-xl bg-cinnabar-soft p-4">
          <p class="text-center text-[15px] font-bold text-cinnabar">
            本工具仅供学习研究，不构成医疗建议，不提供用药推荐。
          </p>
        </div>
      </div>

      <label
        class="mt-6 flex cursor-pointer items-center justify-center gap-2 text-sm text-ink-secondary"
      >
        <input
          v-model="agreed"
          type="checkbox"
          class="h-5 w-5 rounded border-border-paper text-cinnabar"
        >
        我已阅读并同意以上协议
      </label>

      <BaseButton
        class="mt-4"
        size="lg"
        block
        :disabled="!agreed"
        @click="start"
      >
        同意并开始学习
      </BaseButton>
      <p class="mt-4 text-center text-xs text-ink-muted">
        完整协议文本见
        <RouterLink
          to="/disclaimer"
          class="text-indigo"
        >
          《用户协议与免责声明》
        </RouterLink>
      </p>
    </main>
  </div>
</template>
