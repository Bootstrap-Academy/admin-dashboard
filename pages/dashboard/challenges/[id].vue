<template>
  <main class="container pt-container pb-container grid place-items-center h-screen-inner min">

    <Head>
      <Title>{{ t("Headings.EditChallengeCategory") }}</Title>
    </Head>

    <article class="container-form bg-primary max-w-none">
      <h1 class="text-heading-2 text-center mb-card">{{ t("Headings.EditChallengeCategory") }}</h1>
      <FormChallengeCategory :data="challengeCategory" />
    </article>
  </main>
</template>

<script lang="ts">
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Headings.EditChallengeCategory',
  },
  setup() {
    const { t } = useI18n();

    const route = useRoute();

    const id = computed(() => {
      return <string>(route?.params?.id ?? '');
    });

    const loading = ref(true);
    const challengeCategory: Ref<any> = useChallengeCategory();

    onMounted(async () => {
      await getChallengeCategory(id.value);
      loading.value = false;
    });

    return { t, id, loading, challengeCategory };
  },
};
</script>
