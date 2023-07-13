<template>
  <div class="mb-20">
    <PageTitle class="mb-8" />

    <section class="bg-[#3fdfa933] p-4 flex capitalize gap-2 rounded-md">
      <div class="h-10 w-10 mt-0.5">
        <ExclamationCircleIcon class="text-info min-w-[32px] min-h-[32px]" />
      </div>
      <p class="text-white">
        <span class="font-bold text-3xl"> {{ t("Headings.Reason") }} </span>
        {{ reportReason }}
      </p>
    </section>

    <section v-if="reportSubtaskType?.includes('MULTIPLE_CHOICE_QUESTION')">
      <Reported-TasksQuizInfo :mcq="mcq" />
    </section>
    <Reported-TasksCodingChallengeInfo
      v-else
      :codingChallenge="CodingChallenge"
      :codingChallengeSolution="codingChallengeSolution"
    />
    <section class="flex justify-end gap-4 mt-10">
      <InputBtn
        :loading="loadingInCorrect"
        :icon="XMarkIcon"
        secondary
        @click="fnResolveReport('BLOCK_REPORTER'), (loadingInCorrect = true)"
      >
        {{ t("Buttons.Incorrect") }}</InputBtn
      >
      <InputBtn
        :loading="loadingCorrect"
        :icon="CheckIcon"
        @click="fnResolveReport('BLOCK_CREATOR'), (loadingCorrect = true)"
        >{{ t("Buttons.Correct") }}</InputBtn
      >
    </section>
  </div>
</template>

<script lang="ts">
import {
  useReportReason,
  resolveReport,
  useReportSubtaskType,
  getCodingChallenge,
  getMcq,
  useCodingChallenge,
  useMcq,
  useCodingChallengeSolution,
} from "~~/composables/reportedSubtasks";
import {
  ExclamationCircleIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
definePageMeta({
  middleware: ["auth"],
  layout: "dashboard",
});
export default {
  components: { ExclamationCircleIcon, CheckIcon, XMarkIcon },
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const reportReason = useReportReason();
    const reportSubtaskType: any = useReportSubtaskType();
    const codingChallengeSolution: any = useCodingChallengeSolution();
    const answers = ["haha", "hahaha", "hahahaha", "hahahahaha"];
    const reportId = computed(() => {
      return route.params?.id ?? "";
    });

    const task_id = computed(() => {
      return route.query?.taskId ?? "";
    });
    const subtask_id = computed(() => {
      return route.query?.subtaskId ?? "";
    });

    const loadingCorrect = ref(false);
    const loadingInCorrect = ref(false);
    const CodingChallenge: any = useCodingChallenge();
    const solution: any = useCodingChallengeSolution();
    const mcq: any = useMcq();

    async function fnResolveReport(action: String) {
      const [success, error] = await resolveReport(reportId.value, {
        action: action,
      });
      loadingCorrect.value = false;
      loadingInCorrect.value = false;
      if (success) sucessHandler(success);
      else errorHandler(error);
    }

    function sucessHandler(success: any) {
      openSnackbar("success", "Success.ResolveReport");
      router.push("/dashboard/reported-tasks");
    }

    function errorHandler(error: any) {
      openSnackbar("error", error);
    }

    onMounted(async () => {
      setLoading(true);
      if (reportSubtaskType.value.includes("MULTIPLE_CHOICE_QUESTION")) {
        const [success, error] = await getMcq(task_id.value, subtask_id.value);
        if (error) {
          openSnackbar("error", error ?? "");
          router.push("/dashboard/reported-tasks");
        }
      } else {
        const [success, error] = await getCodingChallenge(
          task_id.value,
          subtask_id.value
        );
        if (error) {
          openSnackbar("error", error ?? "");
          router.push("/dashboard/reported-tasks");
        }
      }
      setLoading(false);
    });

    return {
      reportReason,
      ExclamationCircleIcon,
      answers,
      XMarkIcon,
      CheckIcon,
      fnResolveReport,
      reportId,
      loadingCorrect,
      reportSubtaskType,
      loadingInCorrect,
      t,
      CodingChallenge,
      solution,
      mcq,
      codingChallengeSolution,
    };
  },
};
</script>

<style scoped></style>
