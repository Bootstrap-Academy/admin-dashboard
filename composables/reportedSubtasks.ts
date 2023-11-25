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
export const useReportedTasksLoading = () => useState("useReportedTasksLoading", () => false);

export async function getreportedSubtasksList(firstCall: boolean) {
    const loading = useReportedTasksLoading() 
    loading.value = true;
	try {
		const limit = useLimitReportedTasks();
		const offset = useOffsetReportedTasks();
		const noMoreSubtasks = useNoMoreSubtasks();
		const reportedSubtasks = useReportedSubtasks();

        if (firstCall) {
            offset.value = 0;
            limit.value = 10;
        }

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
		}else noMoreSubtasks.value = false;

		if (firstCall) {
			reportedSubtasks.value = [];
		}

		const allSubTasks = await GET(`challenges/subtasks`);

		// Information: below code is used to append response
		arr = [...reportedSubtasks.value, ...(response ?? [])];
        // Todo: split code below into a function that only does these calls if creator or reporter is not already set

		arr.forEach((subTask: ReportBase) => {
			subTask.creator_id = allSubTasks.find(
				(allSubTask: any) => allSubTask.task_id === subTask.task_id
			).creator;
		});
        // Information: below code is used to get user name & id of reporter and creator 
		try {
            loading.value = true;
			// Combine all promises into an array
			const reporterPromises = arr.map(
				async (subtask) => await getAppUser(subtask?.user_id ?? "")
			);
			const creatorPromises = arr.map(
				async (subtask) => await getAppUser(subtask.creator_id)
			);

			// Execute all promises concurrently
			const [reporters, creators] = await Promise.all([
				Promise.all(reporterPromises),
				Promise.all(creatorPromises),
			]);

			// Process results
			reporters.forEach(([reporter, error], index) => {
				if (reporter) {
					arr[index].userName = reporter.name ?? "";
				} else {
					console.log(
						"Error in getAppUser for user_id:",
						arr[index]?.user_id,
						error
					);
				}
			});
            let testArr :string[] = [] // testF
			creators.forEach(([creator, creatorError], index) => {
                
				if (creator.name) {
					arr[index].creatorName = creator.name;
                    arr[index].taskType = creator.subtask_type;
                    if(!testArr.includes(arr[index].subtask_type)) testArr.push(arr[index].subtask_type) // testF
				} else {
					console.log(
						"No creator for creator_id:",
						arr[index]?.creator_id,
						creatorError
					);
				}
			});
            console.log(testArr); // testF
            
            loading.value = false;
		} catch (error) {
			console.log("Error in parallel execution:", error);
            loading.value = false;
		}
        reportedSubtasks.value = arr;
		return [response, null];
	} catch (error: any) {
        loading.value = false
		return [null, error.data];
	}
}

export async function resolveReport(report_id: any, body: any) {
    // Todo: edit this so i can choose between block reporter, block creator, revise
    // Todo: edit body arg -> get RESOLVE enum and build body from that
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
