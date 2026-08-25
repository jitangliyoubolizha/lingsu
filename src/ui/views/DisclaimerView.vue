<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue'
</script>

<template>
  <div class="mx-auto max-w-2xl pb-16">
    <AppHeader
      title="用户协议与免责声明"
      show-back
      back-to="/profile"
    />

    <p class="mb-4 text-xs text-ink-muted">
      版本 v0.2 · 首次使用前请仔细阅读；点击「同意并开始」即表示你已阅读、理解并同意本协议全部内容。
    </p>

    <div class="space-y-5">
      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          一、服务说明
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>「灵素」是一款中医经典文献学习与记忆工具，当前以《伤寒论》为主要学习内容。</li>
          <li>本应用提供条文浏览、背诵复习、方证对照、全文检索、刷题巩固等学习功能。</li>
          <li>本应用为纯前端应用，学习数据默认保存在你的设备本地。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          二、非医疗声明
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>本应用<strong class="text-cinnabar">仅供学习研究使用，不构成医疗建议</strong>。</li>
          <li>本应用不提供诊断、治疗方案、用药推荐，不开展互联网诊疗。</li>
          <li>本应用中的方剂组成、原书剂量、古今剂量换算等内容，仅为古籍文献学习与学术探讨，<strong class="text-cinnabar">不可作为自行用药依据</strong>。</li>
          <li>处方必须由执业医师开具；身体不适应及时到正规医疗机构就医。</li>
          <li>原书剂量为古代度量衡，与现代临床用量存在差异，且存在学术争议，请勿照方抓药。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          三、用户同意与义务
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>你确认已年满 18 周岁，或已在监护人指导下使用本应用。</li>
          <li>你同意不将本应用内容用于医疗诊断、治疗建议或用药指导。</li>
          <li>你同意不利用本应用传播违法、违规或误导性医疗信息。</li>
          <li>你理解本应用内容为初稿，可能存在错字、译文偏差、剂量换算争议等错误。</li>
          <li>发现内容错误时，请通过「意见反馈」页面或产品方提供的反馈渠道告知，我们会据此持续修订。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          四、内容与版权
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>古籍原文与古代注家著作属于公版内容。</li>
          <li>白话译文由本项目自行编写，未经许可不得用于商业用途。</li>
          <li>本应用不使用受版权保护的现代教材翻译、讲解或图表。</li>
          <li>若你发现内容存在版权问题，请联系产品方处理。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          五、数据存储与备份
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>学习进度、收藏、错题、设置等数据默认保存在你的设备本地（IndexedDB）。</li>
          <li>清除浏览器数据、卸载应用或更换设备可能导致数据丢失。</li>
          <li>本应用提供导出/导入备份功能，建议你定期导出备份。</li>
          <li>本应用当前不提供账号系统和云端同步。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          六、免责条款
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>因不可抗力、浏览器兼容性、设备故障、数据误操作等导致的数据丢失，本应用不承担赔偿责任。</li>
          <li>用户因理解或使用本应用内容产生的任何后果，由用户自行承担。</li>
          <li>本应用内容仅供学习研究，不替代执业医师的诊断与治疗。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          七、协议变更
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>产品方可能根据功能变化或合规要求更新本协议。</li>
          <li>重大变更会在应用内提示；继续使用即视为同意更新后的协议。</li>
        </ol>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          八、联系方式
        </h2>
        <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>产品方：待补充</li>
          <li>反馈渠道：应用内「意见反馈」表单</li>
        </ul>
      </section>

      <section class="rounded-2xl border border-border-paper bg-paper-card p-5 shadow-[0_4px_12px_rgba(34,26,16,.05)]">
        <h2 class="mb-2 font-serif text-base font-bold text-ink">
          九、附则
        </h2>
        <ol class="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink-secondary">
          <li>本协议自你点击「同意并开始」时生效。</li>
          <li>本协议未尽事宜，以国家法律法规为准。</li>
        </ol>
      </section>
    </div>
  </div>
</template>
