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
				<!-- Information: Report Info -->
				<p class="text-xl text-white">Report Info</p>
				<p class="text-md text-white">
					Reported by:
					<span class="text-accent">{{ reportedTask.userName }}</span>
				</p>
				<p class="text-md text-white">
					Reason: <span class="text-accent">{{ reportedTask.reason.toLowerCase() }}</span
				>
				</p>
				<p class="text-md text-white">
					Comment: <span class="text-accent">{{ reportedTask.comment }}</span>
				</p>
				<p class="text-md text-white">
					Reported at:
					<span class="text-accent">{{
						`${reportedAt.date} ${reportedAt.month.string}, ${reportedAt.year}`
					}}</span>
				</p>
				<p class="text-md text-white">
					Task Creator:
					<span class="text-accent">{{ reportedTask.creatorName }}</span>
				</p>
			</div>
			<div class="w-2/3 p-3 flex-grow xl:flex-grow-0">
				<section v-if="reportSubtaskType?.includes('MULTIPLE_CHOICE_QUESTION')">
					<Reported-TasksQuizInfo :mcq="mcq" />
				</section>

				<Reported-TasksCodingChallengeInfo
					v-else
					:codingChallenge="CodingChallenge"
					:codingChallengeSolution="codingChallengeSolution"
				/>
			</div>
		</div>
		<section class="flex justify-center gap-4 mt-2 flex-wrap xl:flex-nowrap">
			<!-- Todo: add & edit locales for buttons -->
			<InputBtn sm> Adjust Task </InputBtn>
			<InputBtn sm> Delete Task </InputBtn>
			<InputBtn sm :loading="loadingInCorrect">
				<IconXMark color="red" size="1.1rem" />
				<!-- @click="fnResolveReport('BLOCK_REPORTER'), (loadingInCorrect = true)" -->
				<!-- Information: Block-reporter -->
				Block reporter</InputBtn
			>
			<InputBtn sm :loading="loadingCorrect">
				<!-- Question: Check if I even need these Icons? -->
				<IconCheck color="black" size="1.1rem" />
				<!-- @click="fnResolveReport('BLOCK_CREATOR'), (loadingCorrect = true)" -->
				<!-- Information: Block-creator -->
				Block creator
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
