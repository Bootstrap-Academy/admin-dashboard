import type { ReportBase } from "~/types/reportedTaskTypes";

export const useReportedSubtasks = () =>
	useState<ReportBase[]>("reportedSubtasks", () => []);
export const useReportedSubtask = () => useState("reportedSubtask", () => null);
export const useOffsetReportedTasks = () =>
	useState("offsetReportedTasks", () => 0);
export const useLimitReportedTasks = () =>
	useState("limitReportedTasks", () => 10);
export const useReportReason = () => useCookie("reportReason");
export const useReportSubtaskType = () => useCookie("reportSubtaskType");
export const useCodingChallenge = () => useState("codingChallenge", () => null);
export const useCodingChallengeSolution = () =>
	useState("codingChallengeSolution", () => null);
export const useMcq = () => useState("mcq", () => null);
export const useNoMoreSubtasks = () => useState("noMoreSubtasks", () => false);

export async function getreportedSubtasksList(firstCall: boolean) {
	try {
		const limit = useLimitReportedTasks();
		const offset = useOffsetReportedTasks();
		const noMoreSubtasks = useNoMoreSubtasks();

		const response: ReportBase[] = await GET(
			`/challenges/subtask_reports?limit=${limit.value}&offset=${offset.value}`
		);

		let arr: ReportBase[] = response ?? [];
		if (!arr.length) {
			noMoreSubtasks.value = true;
			return openSnackbar("info", "Body.NoMoreReports");
		}
		if (arr.length < 10) {
			noMoreSubtasks.value = true;
		}
		const reportedSubtasks = useReportedSubtasks();
		console.log(reportedSubtasks.value, "reportetSubtasks");

		if (firstCall) {
			reportedSubtasks.value = [];
		}

		const allSubTasks = await GET(`challenges/subtasks`);

		// Information: below code is used to append response
		arr = [...reportedSubtasks.value, ...(response ?? [])];

		arr.forEach((subTask: ReportBase) => {
			subTask.creator_id = allSubTasks.find(
				(allSubTask: any) => allSubTask.task_id === subTask.task_id
			).creator;
		});

		arr.forEach(async (subtask: ReportBase, index: number) => {
			if (index >= reportedSubtasks.value.length) {
				try {
					const [reporter, error] = await getAppUser(subtask?.user_id ?? "");
					if (reporter) {
						subtask.userName = reporter?.name ?? "";
						reportedSubtasks.value.push(subtask);
					}

                    const [creator, creatorError] = await getAppUser(subtask.creator_id)
                    if (creator){
                        subtask.creatorName = creator.name ?? ""
                    }
                
				} catch (error: any) {
					console.log("error in get app user", error);
				}
			}
		});

		return [response, null];
	} catch (error: any) {
		return [null, error.data];
	}
}

export async function resolveReport(report_id: any, body: any) {
	try {
		const res = await PUT(`/challenges/subtask_reports/${report_id}`, body);
		return [res, null];
	} catch (error: any) {
		let details = error?.data?.error ?? "";
		if (details.includes("already_resolved")) {
			error.data.detail = "Error.ReportAlreadyResolved";
		} else if (details.includes("report_not_found")) {
			error.data.detail = "Error.ReportNotFound";
		}

		console.log("error is this", error.data);
		return [null, error.data.detail];
	}
}

export async function getCodingChallenge(task_id: any, subtask_id: any) {
	try {
		const res = await GET(
			`/challenges/tasks/${task_id}/coding_challenges/${subtask_id}`
		);
		await getCodingChallengeSolution(task_id, subtask_id);
		const codingChallenge: any = useCodingChallenge();
		codingChallenge.value = res ?? null;
		return [res, null];
	} catch (error: any) {
		let details = error?.data?.error ?? "";
		if (details.includes("subtask_not_found")) {
			error.data.detail = "Error.CodingChallengeNotFound";
		}

		console.log("error is this", error.data);
		return [null, error.data.detail];
	}
}

export async function getCodingChallengeSolution(
	task_id: any,
	subtask_id: any
) {
	try {
		const res = await GET(
			`/challenges/tasks/${task_id}/coding_challenges/${subtask_id}/solution`
		);
		const codingChallengeSolution: any = useCodingChallengeSolution();
		codingChallengeSolution.value = res ?? null;
		return [res, null];
	} catch (error: any) {
		return [null, error];
	}
}

export async function getMcq(task_id: any, subtask_id: any) {
	try {
		const res = await GET(
			`/challenges/tasks/${task_id}/multiple_choice/${subtask_id}/solution`
		);
		const mcq: any = useMcq();
		mcq.value = res ?? null;
		return [res, null];
	} catch (error: any) {
		let details = error?.data?.error ?? "";
		if (details.includes("subtask_not_found")) {
			error.data.detail = "Error.McqNotFound";
		}

		console.log("error is this", error.data);
		return [null, error.data.detail];
	}
}
