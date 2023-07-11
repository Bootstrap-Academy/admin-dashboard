export const useReportedSubtasks = () => useState("reportedSubtasks", () => [])
export const useReportedSubtask = () => useState("reportedSubtask", () => null)
export const useOffsetReportedTasks = () => useState("offsetReportedTasks", () => 0)
export const useLimitReportedTasks = () => useState("limitReportedTasks", () => 10)

export async function getreportedSubtasksList() {
    try {
        const limit = useLimitReportedTasks()
        const offset = useOffsetReportedTasks()
        // const response = await GET(`/challenges/subtask_reports`);
        const response = await GET(`/challenges/subtask_reports?limit=${limit.value}&offset=${offset.value}`);
        let arr = response ?? []
        const reportedSubtasks: any = useReportedSubtasks();

        console.log("offset is bigger and we are pushing it in previous results")
        arr = [...reportedSubtasks.value, ...response ?? []]

        arr.forEach(async (subtask: any, index: any) => {
            if (index >= reportedSubtasks.value.length) {
                const [success, error] = await getAppUser(subtask?.user_id ?? "")
                if (success) {
                    console.log("success from function for getting user", success?.name ?? "")
                    subtask.userName = success?.name ?? ""
                    reportedSubtasks.value.push(subtask)
                }
            }
        });

        // reportedSubtasks.value = arr;

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}

export async function getReportedSubtask() {
    try {
        const response = await GET(`/challenges/subtasks_reports`);

        const reportedSubtask = useReportedSubtask();
        reportedSubtask.value = response ?? null;

        return [response, null];
    } catch (error: any) {
        return [null, error.data];
    }
}