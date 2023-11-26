<template>
	<div class="mb-20">
		<PageTitle class="mb-2" />
		<!-- Todo: add Information Reported By, Reason, Comment, Reported At, and Creator of the task -->
		<section
			class="bg-[#3fdfa933] p-2 flex items-center capitalize gap-2 rounded-md"
		>
			<div class="h-10 w-10 mt-0.5">
				<ExclamationCircleIcon class="text-info min-w-[20px] min-h-[20px]" />
			</div>
			<p class="text-white">
				<span class="font-bold text-xl"> {{ t("Headings.Reason") }} </span>
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
			<!-- Todo: add & edit locales for buttons -->
			<!-- Todo: fix Icons -->
			<InputBtn sm> Adjust Task </InputBtn>
			<InputBtn sm> Delete Task </InputBtn>
			<InputBtn sm :loading="loadingInCorrect">
				<IconXMark color="red" size="1.1rem"/>
				<!-- @click="fnResolveReport('BLOCK_REPORTER'), (loadingInCorrect = true)" -->
				<!-- Information: Block-reporter -->
				{{ t("Buttons.Incorrect") }}</InputBtn
			>
			<InputBtn sm :loading="loadingCorrect">
				<!-- Question: Check if I even need these Icons? -->
				<IconCheck color="black" size="1.1rem"/>
				<!-- @click="fnResolveReport('BLOCK_CREATOR'), (loadingCorrect = true)" -->
				<!-- Information: Block-creator -->
				{{ t("Buttons.Correct") }}
			</InputBtn>
		</section>
	</div>
</template>

<script lang="ts" setup>
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
	import { ExclamationCircleIcon, CheckIcon } from "@heroicons/vue/24/outline";
	import { useI18n } from "vue-i18n";

	definePageMeta({
		middleware: ["auth"],
		layout: "dashboard",
	});
	const { t } = useI18n();
	const route = useRoute();
	const router = useRouter();
	const reportReason = useReportReason();
	const reportSubtaskType: any = useReportSubtaskType(); // Todo: remove this -> is not needed
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
		if (reportSubtaskType.value.includes("MULTIPLE_CHOICE_QUESTION")) {
			const [success, error] = await getMcq(task_id.value, subtask_id.value);
			if (error) {
				openSnackbar("error", error ?? "");
				router.push("/dashboard/reported-tasks");
			}
		} else {
			// Todo: I need more if statements here, some tasks are neither MCQ nor Coding Challenges
			const [success, error] = await getCodingChallenge(
				task_id.value,
				subtask_id.value
			);
			if (error) {
				openSnackbar("error", error ?? "");
				// router.push("/dashboard/reported-tasks");
			}
		}
	});
</script>

<style scoped></style>
