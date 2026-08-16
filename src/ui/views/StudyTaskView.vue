<script setup lang="ts">
import { Check, RotateCcw, X } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import BaseButton from '../components/BaseButton.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { clauses } from '../mockData'

const router = useRouter()

const currentIndex = ref(0)
const flipped = ref(false)
const selfRating = ref<'forgot' | 'fuzzy' | 'remember' | null>(null)

const current = computed(() => clauses[currentIndex.value % clauses.length])
const total = 20
const done = 5 + currentIndex.value

function next() {
  if (currentIndex.value < total - 1) {
    currentIndex.value += 1
    flipped.value = false
    selfRating.value = null
  } else {
    void router.push('/')
  }
}
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg flex-col">
    <header class="flex min-h-12 items-center justify-between gap-2">
      <button
        type="button"
        class="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary hover:bg-paper-deep"
        aria-label="退出学习"
        @click="router.push('/')"
      >
        <X
          class="h-5 w-5"
          aria-hidden="true"
        />
      </button>
      <span class="text-sm text-ink-secondary">第 {{ currentIndex + 1 }} 题 / 共 {{ total }} 条</span>
      <span
        class="w-9"
        aria-hidden="true"
      />
    </header>

    <div class="mt-1">
      <ProgressBar :value="(done / total) * 100" />
    </div>

    <div class="mt-6 flex flex-1 flex-col">
      <div class="relative flex-1 [perspective:1200px]">
        <div
          class="relative h-full min-h-[360px] transition-transform duration-300 ease-in-out"
          :class="flipped ? '[transform:rotateY(180deg)]' : ''"
          :style="{ transformStyle: 'preserve-3d' }"
        >
          <!-- 正面 -->
          <div
            class="absolute inset-0 flex flex-col rounded-2xl border border-border-paper bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)] [backface-visibility:hidden]"
          >
            <p class="text-xs text-ink-muted">
              {{ current.title }}
            </p>
            <div class="mt-6 flex flex-1 items-center justify-center">
              <p class="text-center font-serif text-[26px] leading-[1.8] text-ink">
                {{ current.text }}
              </p>
            </div>
            <div class="mt-6 text-center">
              <BaseButton
                variant="secondary"
                class="w-full"
                @click="flipped = true"
              >
                点击查看原文
              </BaseButton>
            </div>
          </div>

          <!-- 背面 -->
          <div
            class="absolute inset-0 flex flex-col rounded-2xl border border-cinnabar/40 bg-paper-card p-6 shadow-[0_8px_24px_rgba(34,26,16,.10)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <p class="text-xs text-ink-muted">
              释义
            </p>
            <div class="mt-4 flex-1 overflow-y-auto">
              <p class="font-serif text-lg leading-relaxed text-ink">
                {{ current.translation }}
              </p>
              <div
                v-if="selfRating"
                class="mt-4 rounded-xl bg-paper-deep p-3 text-sm text-ink-secondary"
              >
                <p
                  v-if="selfRating === 'remember'"
                  class="font-semibold text-green"
                >
                  记得
                </p>
                <p
                  v-else-if="selfRating === 'fuzzy'"
                  class="font-semibold text-gold"
                >
                  模糊
                </p>
                <p
                  v-else
                  class="font-semibold text-red"
                >
                  忘了
                </p>
                <p class="mt-1">
                  已记录本次自评，下一张卡片即将开始。
                </p>
              </div>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2">
              <BaseButton
                variant="secondary"
                class="border-red/60 text-red"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'forgot'"
              >
                忘了
              </BaseButton>
              <BaseButton
                variant="secondary"
                class="border-gold/60 text-gold"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'fuzzy'"
              >
                模糊
              </BaseButton>
              <BaseButton
                variant="primary"
                class="bg-green shadow-none hover:bg-green"
                :disabled="Boolean(selfRating)"
                @click="selfRating = 'remember'"
              >
                <Check
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                记得
              </BaseButton>
            </div>
            <BaseButton
              v-if="selfRating"
              class="mt-3 w-full"
              @click="next"
            >
              下一张
              <RotateCcw
                class="h-4 w-4"
                aria-hidden="true"
              />
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
