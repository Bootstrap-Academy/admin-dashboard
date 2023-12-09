<template>
	<div class="flex flex-col gap-5">
		<PageTitle class="mb-2" />
		<section
			class="bg-[#3fdfa933] p-2 flex items-center capitalize gap-2 rounded-md"
		>
			<div class="h-10 w-10 mt-0.5">
				<ExclamationCircleIcon class="text-info min-w-[20px] min-h-[20px]" />
			</div>
			<p class="text-white">
				<span class="font-bold text-xl"> {{ t("Headings.Reason") }} </span>
				{{ reportedTask.reason.toLowerCase() }}
			</p>
		</section>
		<div class="flex flex-wrap xl:flex-nowrap justify-center">
			<div class="w-1/3 p-3 min-w-[400px] flex-grow xl:flex-grow-0">
				<!-- Todo: add task-type -->
				<!-- Information: Report Info -->
				<p class="text-xl text-white">{{ t("Body.reportInformation") }}</p>
				<p class="text-md text-white">
					{{ t("Body.taskType") }}:
					<span class="text-accent">{{
						t(`Body.${reportedTask.subtask_type}`)
					}}</span>
				</p>
				<p class="text-md text-white">
					{{ t("Body.reportedBy") }}:
					<span class="text-accent">{{ reportedTask.userName }}</span>
				</p>
				<p class="text-md text-white">
					{{ t("Body.reason") }}:
					<span class="text-accent">{{
						reportedTask.reason.toLowerCase()
					}}</span>
				</p>
				<p class="text-md text-white">
					{{ t("Body.comment") }}:
					<span class="text-accent">{{ reportedTask.comment }}</span>
				</p>
				<p class="text-md text-white">
					{{ t("Body.reportedAt") }}:
					<span class="text-accent">{{
						`${reportedAt.date} ${reportedAt.month.string}, ${reportedAt.year}`
					}}</span>
				</p>
				<p class="text-md text-white">
					{{ t("Body.taskCreator") }}:
					<span class="text-accent">{{ reportedTask.creatorName }}</span>
				</p>
			</div>
			<div class="w-2/3 p-3 flex-grow xl:flex-grow-0">
				<Reported-TasksQuizInfo
					:mcq="mcq"
					v-if="
						reportedTask.subtask_type === TASK_TYPE.MULTIPLE_CHOICE_QUESTION
					"
				/>
				<Reported-TasksCodingChallengeInfo
					v-if="reportedTask.subtask_type === TASK_TYPE.CODING_CHALLENGE"
					:codingChallenge="CodingChallenge"
					:codingChallengeSolution="codingChallengeSolution"
				/>

				<Reported-TasksMatching
					v-if="reportedTask.subtask_type === TASK_TYPE.MATCHING"
				/>

				<Reported-TasksQuestion
					v-if="reportedTask.subtask_type === TASK_TYPE.QUESTION"
				/>
			</div>
		</div>
		<section class="flex justify-center gap-4 mt-2 flex-wrap xl:flex-nowrap">
			<InputBtn
				sm
				:loading="loadingCorrect"
				@click="fnResolveReport(RESOLVE.REVISE), (loadingCorrect = true)"
			>
				{{ t("Buttons.adjustTask") }}
			</InputBtn>

			<InputBtn
				sm
				:loading="loadingCorrect"
				@click="deleteTask(), (loadingCorrect = true)"
			>
				{{ t("Buttons.deleteTask") }}
			</InputBtn>

			<InputBtn
				sm
				:loading="loadingCorrect"
				@click="
					fnResolveReport(RESOLVE.BLOCK_REPORTER), (loadingCorrect = true)
				"
			>
				{{ t("Buttons.blockReporter") }}
			</InputBtn>

			<InputBtn
				sm
				:loading="loadingCorrect"
				@click="fnResolveReport(RESOLVE.BLOCK_CREATOR), (loadingCorrect = true)"
			>
				<!-- Information: Block-creator -->
				{{ t("Buttons.blockCreator") }}
			</InputBtn>
		</section>
	</div>
</template>

<script lang="ts" setup>
	import {
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
	import { RESOLVE, TASK_TYPE } from "~/types/reportedTaskTypes";

	definePageMeta({
		middleware: ["auth"],
		layout: "dashboard",
	});

	const { t } = useI18n();
	const route = useRoute();
	const router = useRouter();
	const reportSubtaskType: any = useReportSubtaskType(); // Todo: remove this -> is not needed
	const codingChallengeSolution: any = useCodingChallengeSolution();
	const reportId = computed(() => {
		return route.params?.id ?? "";
	});

	const task_id = computed(() => {
		return route.query?.taskId ?? "";
	});
	const subtask_id = computed(() => {
		return route.query?.subtaskId ?? "";
	});

	const reportedTask = useReportedSubtask();
	const reportedAt = computed(() => {
		return convertTimestampToDate(
			convertDateToTimestamp(reportedTask.value.timestamp)
		);
	});

	const loadingCorrect = ref(false);
	const loadingInCorrect = ref(false);
	const CodingChallenge: any = useCodingChallenge();
	const solution: any = useCodingChallengeSolution();
	const mcq: any = useMcq();

	async function fnResolveReport(action: RESOLVE) {
		const [success, error] = await resolveReport(reportId.value, {
			action: action,
		});
		loadingCorrect.value = false;
		loadingInCorrect.value = false;
		if (success) sucessHandler(success);
		else errorHandler(error);
	}

	const deleteTask = async () => {
		const [success, error] = await deleteReportedTask(
			reportedTask.value.task_id,
			reportedTask.value.subtask_id
		);
		loadingCorrect.value = false;
		loadingInCorrect.value = false;
		if (success) sucessHandler(success);
		else errorHandler(error);
	};

	function sucessHandler(success: any) {
		openSnackbar("success", "Success.ResolveReport");
		router.push("/dashboard/reported-tasks");
	}

	function errorHandler(error: any) {
		openSnackbar("error", error);
	}

	onMounted(async () => {
		if (
			reportedTask.value.subtask_type === TASK_TYPE.MULTIPLE_CHOICE_QUESTION
		) {
			// Information: Multiple Choice Question
			const [success, error] = await getMcq(task_id.value, subtask_id.value);
			if (error) {
				openSnackbar("error", error ?? "");
				router.push("/dashboard/reported-tasks");
			}
		} else if (reportedTask.value.subtask_type === TASK_TYPE.MATCHING) {
			// Information: Matching
			console.log("matching");
			const [success, error] = await getMatching(
				reportedTask.value.task_id,
				reportedTask.value.subtask_id
			);
			if (error) {
				openSnackbar("error", t("Error.errorLoadingMatchingTask"));
				router.push("/dashboard/reported-tasks");
			}
		} else if (reportedTask.value.subtask_type === TASK_TYPE.CODING_CHALLENGE) {
			// Information: Coding Challenge
			const [success, error] = await getCodingChallenge(
				task_id.value,
				subtask_id.value
			);
			if (error) {
				openSnackbar("error", error ?? "");
				// router.push("/dashboard/reported-tasks");
			}
		} else if (reportedTask.value.subtask_type === TASK_TYPE.QUESTION) {
			// Information: Question
			console.log("question");
		}
	});
</script>

<style scoped></style>
