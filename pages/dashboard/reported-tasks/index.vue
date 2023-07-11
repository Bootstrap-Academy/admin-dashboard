<template>
  <div>
    <Reported-TasksTable :data="reportedSubtasksList" :loading="loading" />

    <Btn @click="onclickLoadMore" secondary class="mx-auto mt-card">
      <template v-if="loading">
        <span class="mr-2">Loading</span>
        <LoadingCircular />
      </template>
      <span v-else>Load More</span>
    </Btn>

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
} from "../../../composables/reportedSubtasks";

definePageMeta({
  middleware: ["auth"],
  layout: "dashboard",
});

export default {
  setup() {
    const limit = useLimitReportedTasks();
    const offset = useOffsetReportedTasks();
    const { t } = useI18n();
    const reportedSubtasksList = useReportedSubtasks();
    const loading = ref(
      !(reportedSubtasksList.value && reportedSubtasksList.value.length > 0)
    );

    const scrollRef = ref<HTMLElement | null>(null);
    async function onclickLoadMore() {
      offset.value = offset.value + limit.value;
      loading.value = true;
      await getreportedSubtasksList();
      loading.value = false;
    }

    onMounted(async () => {
      loading.value = true;
      await getreportedSubtasksList();
      loading.value = false;
    });

    return { scrollRef, reportedSubtasksList, loading, onclickLoadMore };
  },
};
</script>

<style scoped></style>
