<template>
  <main class="container pt-container pb-container grid place-items-center h-screen-inner min">

    <Head>
      <Title>{{ t("Headings.CreateChallengeCategory") }}</Title>
    </Head>

    <article class="container-form bg-primary max-w-none">
      <h1 class="text-heading-2 text-center mb-card">{{ t("Headings.CreateChallengeCategory") }}</h1>
      <FormChallengeCategory />
    </article>
  </main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Headings.CreateChallengeCategory',
  },
  setup() {
    const { t } = useI18n();
    return { t };
  },
};
</script>
