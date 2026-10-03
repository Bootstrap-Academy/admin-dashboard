import { MatchingWithSolution, ReportBase } from "~/types/reportedTaskTypes";

export const useReportedSubtasks = () =>
  useState<ReportBase[]>("reportedSubtasks", () => []);
export const useReportedSubtask = () =>
  useState<ReportBase>("reportedSubtask", () => new ReportBase());
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
export const useReportedTasksLoading = () =>
  useState("useReportedTasksLoading", () => false);
export const useMatching = () =>
  useState<MatchingWithSolution>("matching", () => new MatchingWithSolution());

export async function getreportedSubtasksList(firstCall: boolean) {
  const loading = useReportedTasksLoading();
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
      `/challenges/subtask_reports?limit=${limit.value}&offset=${offset.value}`,
    );

    let arr: ReportBase[] = response ?? [];

    if (!arr.length) {
      noMoreSubtasks.value = true;
      return openSnackbar("info", "Body.NoMoreReports");
    }
    if (arr.length < 10) {
      noMoreSubtasks.value = true;
    } else noMoreSubtasks.value = false;

    if (firstCall) {
      reportedSubtasks.value = [];
    }

    reportedSubtasks.value = [...reportedSubtasks.value, ...(response ?? [])];

    await assignReportUser();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

// Information: below code is used to get user name & id of reporter and creator
export async function assignReportUser() {
  // Keep the exact reports that started these lookups across navigation/reload.
  const reports = [...useReportedSubtasks().value];
  const loading = useReportedTasksLoading();
  try {
    loading.value = true;
    const allSubTasks = await GET(`challenges/subtasks`);
    reports.forEach((subTask) => {
      subTask.creator_id =
        allSubTasks.find(
          (allSubTask: any) => allSubTask.id === subTask.subtask_id,
        )?.creator ?? "";
    });
    // Combine all promises into an array
    const reporterPromises = reports.map(
      async (subtask) => await getAppUser(subtask?.user_id ?? ""),
    );
    const creatorPromises = reports.map(
      async (subtask) => await getAppUser(subtask.creator_id),
    );

    // Execute all promises concurrently
    const [reporters, creators] = await Promise.all([
      Promise.all(reporterPromises),
      Promise.all(creatorPromises),
    ]);

    // Process results
    reporters.forEach(([reporter, error], index) => {
      const report = reports[index];
      if (!report) return;
      if (reporter) {
        report.userName = reporter.name ?? "";
      } else {
        console.log(
          "Error in getAppUser for user_id:",
          report.user_id,
          error,
        );
      }
    });
    creators.forEach(([creator, creatorError], index) => {
      const report = reports[index];
      if (!report) return;
      if (creator?.name) {
        report.creatorName = creator.name;
      } else {
        console.log(
          "No creator for creator_id:",
          report.creator_id,
          creatorError,
        );
      }
    });
  } catch (error) {
    console.log("Error in parallel execution:", error);
  } finally {
    loading.value = false;
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

    console.log("error in resolveReport", error.data, report_id, body);
    return [null, error.data.detail];
  }
}

export async function getCodingChallenge(task_id: any, subtask_id: any) {
  try {
    const res = await GET(
      `/challenges/tasks/${task_id}/coding_challenges/${subtask_id}`,
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

    console.log("Error in getCodingChallenge", error.data, task_id, subtask_id);
    return [null, error.data.detail];
  }
}

export async function getCodingChallengeSolution(
  task_id: any,
  subtask_id: any,
) {
  try {
    const res = await GET(
      `/challenges/tasks/${task_id}/coding_challenges/${subtask_id}/solution`,
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
      `/challenges/tasks/${task_id}/multiple_choice/${subtask_id}/solution`,
    );
    const mcq: any = useMcq();
    mcq.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    let details = error?.data?.error ?? "";
    if (details.includes("subtask_not_found")) {
      error.data.detail = "Error.McqNotFound";
    }

    console.log("error in getMcq", error.data, task_id, subtask_id);
    return [null, error.data.detail];
  }
}

export async function getMatching(taskId: string, subTaskId: string) {
  const matching = useMatching();
  matching.value = new MatchingWithSolution();
  try {
    const res: MatchingWithSolution = await GET(
      `/challenges/tasks/${taskId}/matchings/${subTaskId}/solution`,
    );
    matching.value = res ?? null;
    return [res, null];
  } catch (error: any) {
    console.log("error in getMatching", error.data, taskId, subTaskId);
    return [null, error];
  }
}

export async function deleteReportedTask(taskId: string, subTaskId: string) {
  let error: Error | undefined;
  try {
    await DELETE(`challenges/tasks/${taskId}/subtasks/${subTaskId}`);
    return [true, error];
  } catch (err: any) {
    error = err;
    return [false, error];
  }
}
