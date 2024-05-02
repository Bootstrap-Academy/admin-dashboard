<template>
  <div>
    <Head>
      <Title>{{ t('Headings.reportedTasks') }}</Title>
    </Head>
    <PageTitle class="mb-8" />
    <div ref="scrollRef"></div>
    <Reported-TasksTable :data="reportedSubtasksList" :loading="loading" />

    <Btn
      v-if="!!!noMoreSubtasks"
      @click="onclickLoadMore"
      secondary
      class="mx-auto mt-card"
    >
      <template v-if="loading">
        <span class="mr-2">Loading</span>
        <LoadingCircular />
      </template>
      <span v-else-if="!loading">Load More</span>
    </Btn>

    <p v-else class="text-center mt-10">
      {{ t("Headings.NoMoreSubtasks") }}
    </p>
    <ScrollToBtn :scrollRef="scrollRef" />
  </div>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import {
  getreportedSubtasksList,
  useReportedSubtasks,
  useLimitReportedTasks,
  useOffsetReportedTasks,
  useNoMoreSubtasks,
} from "../../../composables/reportedSubtasks";

definePageMeta({
  middleware: ["auth"],
  layout: "dashboard",
});

export default {
  head: {
    title: "Reported Skills",
  },

  setup() {
    const limit = useLimitReportedTasks();
    const offset = useOffsetReportedTasks();
    const noMoreSubtasks = useNoMoreSubtasks();
    const { t } = useI18n();
    const reportedSubtasksList = useReportedSubtasks();
    const loading = useReportedTasksLoading()

    const scrollRef = ref<HTMLElement | null>(null);
    async function onclickLoadMore() {
      loading.value = true
      offset.value = offset.value + limit.value;
      await getreportedSubtasksList(false);
    }

    onMounted(async () => {
      console.log("mounted");
      offset.value = 0;
      limit.value = 10;
      reportedSubtasksList.value = [];
      await getreportedSubtasksList(true);
    });

    return {
      scrollRef,
      reportedSubtasksList,
      loading,
      onclickLoadMore,
      noMoreSubtasks,
      t,
    };
  },
};
</script>

<style scoped></style>
