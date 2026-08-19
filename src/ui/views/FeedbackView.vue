<script setup lang="ts">
import { MailCheck } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  buildFeedbackMailto,
  FEEDBACK_EMAIL,
  FEEDBACK_TYPE_LABELS,
  submitFeedback,
  type FeedbackType,
} from '../feedback'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()

function feedbackTypeFromQuery(value: unknown): FeedbackType {
  return value === 'formula' || value === 'feature' || value === 'other' ? value : 'clause'
}

const type = ref<FeedbackType>(feedbackTypeFromQuery(route.query.type))
const location = ref(typeof route.query.location === 'string' ? route.query.location : '')
const fromPage = typeof route.query.from === 'string' ? route.query.from : ''
const description = ref('')
const contact = ref('')
const error = ref('')
const sent = ref(false)

const canSubmit = computed(() => description.value.trim().length > 0)

function submit() {
  error.value = ''
  sent.value = false
  const result = buildFeedbackMailto({
    type: type.value,
    location: location.value,
    description: description.value,
    contact: contact.value,
    pageUrl: fromPage || window.location.href,
  })
  if (!result.ok) {
    error.value = result.error
    return
  }
  submitFeedback(result.mailto)
  sent.value = true
}
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="意见反馈"
      show-back
      back-to="/"
    />

    <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
      <h2 class="font-serif text-base font-bold text-ink">
        内容纠错 · 简单两步
      </h2>
      <p class="mt-1 text-xs leading-relaxed text-ink-muted">
        发现条文、方剂或功能问题？填一下，提交后会打开邮件，点发送即可，不用注册登录。
      </p>

      <form
        class="mt-4 space-y-4"
        @submit.prevent="submit"
      >
        <div>
          <label
            for="feedback-type"
            class="mb-1 block text-sm text-ink-secondary"
          >
            反馈类型
          </label>
          <select
            id="feedback-type"
            v-model="type"
            class="h-11 w-full rounded-xl border border-border-paper bg-paper-card px-3 text-sm text-ink"
          >
            <option
              v-for="(label, value) in FEEDBACK_TYPE_LABELS"
              :key="value"
              :value="value"
            >
              {{ label }}
            </option>
          </select>
        </div>

        <div>
          <label
            for="feedback-location"
            class="mb-1 block text-sm text-ink-secondary"
          >
            位置或条号（选填）
          </label>
          <input
            id="feedback-location"
            v-model="location"
            type="text"
            maxlength="100"
            class="h-11 w-full rounded-xl border border-border-paper bg-paper-card px-3 text-sm text-ink placeholder:text-ink-muted"
            placeholder="如：太阳·第 12 条 / 桂枝汤"
          >
        </div>

        <div>
          <div class="mb-1 flex items-baseline justify-between">
            <label
              for="feedback-description"
              class="block text-sm text-ink-secondary"
            >
              问题描述（必填）
            </label>
            <span class="text-xs text-ink-muted">{{ description.length }}/500</span>
          </div>
          <textarea
            id="feedback-description"
            v-model="description"
            rows="5"
            maxlength="500"
            class="w-full rounded-xl border border-border-paper bg-paper-card p-3 text-sm leading-relaxed text-ink placeholder:text-ink-muted"
            placeholder="简单描述你发现的问题，如：第 12 条译文与原文不符"
          />
        </div>

        <div>
          <label
            for="feedback-contact"
            class="mb-1 block text-sm text-ink-secondary"
          >
            联系方式（选填）
          </label>
          <input
            id="feedback-contact"
            v-model="contact"
            type="text"
            maxlength="100"
            class="h-11 w-full rounded-xl border border-border-paper bg-paper-card px-3 text-sm text-ink placeholder:text-ink-muted"
            placeholder="邮箱或微信，方便我们回复你"
          >
        </div>

        <p
          v-if="error"
          class="rounded-xl bg-cinnabar-soft px-3 py-2 text-sm font-semibold text-cinnabar"
          role="alert"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cinnabar font-sans text-[15px] font-semibold text-white shadow-[0_4px_10px_rgba(110,0,0,.15)] transition-all duration-100 hover:bg-cinnabar-deep active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          :disabled="!canSubmit"
        >
          提交反馈
        </button>

        <p
          v-if="sent"
          class="flex items-start gap-2 rounded-xl bg-green-soft px-3 py-2.5 text-sm text-green"
          role="status"
        >
          <MailCheck
            class="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            已打开邮件应用；若未弹出，请直接发送至 {{ FEEDBACK_EMAIL }}。
          </span>
        </p>

        <p class="text-center text-xs text-ink-muted">
          反馈将发送至 {{ FEEDBACK_EMAIL }}
        </p>
      </form>
    </section>
  </div>
</template>
