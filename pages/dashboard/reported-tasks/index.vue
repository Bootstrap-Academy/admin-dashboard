<template>
  <div>
    <Head>
      <Title>Manage User - {{ appUser?.name ?? "" }}</Title>
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
      <span v-else>Load More</span>
    </Btn>

    <p v-else class="text-center mt-10">
      {{ t("Headings.NoMoreSubtasks") }}
    </p>

    <ScrollToBtn :scrollRef="scrollRef" />
  </div>
</template>

<script lang="ts">
import { Ref, ref, onMounted } from "vue";
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
    const loading = ref(
      !(reportedSubtasksList.value && reportedSubtasksList.value.length > 0)
    );

    const scrollRef = ref<HTMLElement | null>(null);
    async function onclickLoadMore() {
      offset.value = offset.value + limit.value;
      loading.value = true;
      await getreportedSubtasksList(false);
      loading.value = false;
    }

    onMounted(async () => {
      reportedSubtasksList.value = [];
      loading.value = true;
      await getreportedSubtasksList(true);
      loading.value = false;
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
