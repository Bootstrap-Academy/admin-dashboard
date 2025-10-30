<template>
  <main class="space-y-6">
    <PageTitle />

    <section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-900/30">
      <div class="space-y-4 text-slate-200">
        <h2 class="text-lg font-semibold text-slate-100">
          {{ t('Headings.Dashboard') }}
        </h2>
        <p class="text-sm text-slate-400">
          {{ t('Body.DashboardPlaceholder') }}
        </p>
        <p class="text-sm text-slate-500">
          {{ t('Body.DashboardPlaceholderHint') }}
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

useHead({
  title: 'Dashboard',
});

const { t } = useI18n();
</script>
