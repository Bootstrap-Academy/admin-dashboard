<template>
  <main>
    <div ref="scrollRef"></div>
    <PageTitle />

    <Head>
      <Title>{{ t("Headings.Challenges") }}</Title>
    </Head>

    <div class="flex justify-end mb-card">
      <NuxtLink to="/dashboard/challenges/create" class="flex-shrink-0 w-fit">
        <Btn :icon="PlusIcon">{{ t("Headings.CreateChallengeCategory") }}</Btn>
      </NuxtLink>
    </div>

    <ChallengesTable :data="challengeCategories" :loading="loading" />

    <ScrollToBtn :scrollRef="scrollRef" />
  </main>
</template>

<script lang="ts">
import { PlusIcon } from '@heroicons/vue/20/solid';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

export default {
  head: {
    title: 'Challenges',
  },
  setup() {
    const { t } = useI18n();

    const scrollRef = ref<HTMLElement | null>(null);

    const challengeCategories: Ref<any[]> = useChallengeCategories();

    const loading = ref(!(challengeCategories.value && challengeCategories.value.length > 0));

    onMounted(async () => {
      await getChallengeCategories();
    });

    const sortOptions = [
      {
        label: 'Latest',
        value: 'latest',
      },
      {
        label: 'Oldest',
        value: 'oldest',
      },
    ];

    return {
      t,
      loading,
      challengeCategories,
      sortOptions,
      scrollRef,
      PlusIcon
    };
  },
};
</script>
