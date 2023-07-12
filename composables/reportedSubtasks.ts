export const useReportedSubtasks = () => useState("reportedSubtasks", () => [])
export const useReportedSubtask = () => useState("reportedSubtask", () => null)
export const useOffsetReportedTasks = () => useState("offsetReportedTasks", () => 0)
export const useLimitReportedTasks = () => useState("limitReportedTasks", () => 10)
export const useReportReason = () => useCookie("reportReason")
export const useReportSubtaskType = () => useCookie("reportSubtaskType")
export const useCodingChallenge = () => useState("codingChallenge", () => null)
export const useCodingChallengeSolution = () => useState("codingChallengeSolution", () => null)
export const useMcq = () => useState("mcq", () => null)
export const useNoMoreSubtasks = () => useState("noMoreSubtasks", () => false)


export async function getreportedSubtasksList(firstCall: any) {
    try {
        const limit = useLimitReportedTasks()
        const offset = useOffsetReportedTasks()
        const noMoreSubtasks = useNoMoreSubtasks()
        // const response = await GET(`/challenges/subtask_reports`);
        const response = await GET(`/challenges/subtask_reports?limit=${limit.value}&offset=${offset.value}`);
        let arr = response ?? []
        if (!arr.length) {
            noMoreSubtasks.value = true
            return openSnackbar("info", "Body.NoMoreReports")
        }
        if (arr.length < 10) {
            noMoreSubtasks.value = true
        }
        const reportedSubtasks: any = useReportedSubtasks();
        if (!!firstCall) {
            reportedSubtasks.value = []
        }
        arr = [...reportedSubtasks.value, ...response ?? []]

        arr.forEach(async (subtask: any, index: any) => {
            if (index >= reportedSubtasks.value.length) {
                try {
                    const [success, error] = await getAppUser(subtask?.user_id ?? "")
                    if (success) {
                        subtask.userName = success?.name ?? ""
                        reportedSubtasks.value.push(subtask)
                    }
                } catch (error: any) {
                    console.log("error in get app user", error)
                }
            }
        });

        // reportedSubtasks.value = arr;

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function resolveReport(report_id: any, body: any) {
    try {
        const res = await PUT(`/challenges/subtask_reports/${report_id}`, body)
        return [res, null]
    }
    catch (error: any) {
        let details = error?.data?.error ?? "";
        if (details.includes("already_resolved")) {
            error.data.detail = "Error.ReportAlreadyResolved";
        }

        console.log("error", error.data)
        return [null, error.data.detail]
    }
}

export async function getCodingChallenge(task_id: any, subtask_id: any) {
    try {
        const res = await GET(`/challenges/tasks/${task_id}/coding_challenges/${subtask_id}`)
        await getCodingChallengeSolution(task_id, subtask_id)
        const codingChallenge: any = useCodingChallenge()
        codingChallenge.value = res ?? null
        return [res, null]
    }
    catch (error: any) {
        return [null, error]

    }
}

export async function getCodingChallengeSolution(task_id: any, subtask_id: any) {
    try {
        const res = await GET(`/challenges/tasks/${task_id}/coding_challenges/${subtask_id}/solution`)
        const codingChallengeSolution: any = useCodingChallengeSolution()
        codingChallengeSolution.value = res ?? null
        return [res, null]
    }
    catch (error: any) {
        return [null, error]

    }
}

export async function getMcq(task_id: any, subtask_id: any) {
    try {
        const res = await GET(`/challenges/tasks/${task_id}/multiple_choice/${subtask_id}/solution`)
        const mcq: any = useMcq()
        mcq.value = res ?? null
        return [res, null]
    }
    catch (error: any) {
        return [null, error]

    }
}