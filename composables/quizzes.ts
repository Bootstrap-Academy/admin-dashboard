import { useState } from "#app";
import { Quiz } from "~/types/courseTypes";
import { GET } from "./fetch";

export const useSubTasksInQuiz = () => useState<Quiz[]>("subTasksInQuiz", () => []);
export const useSubTaskAndSolutionInQuiz = () => useState<any>("subTaskAndSolutionInQuiz", () => null);

export async function getSubTasksInQuiz(taskId: any, creator: any = "") {
  try {
    let query = "";

    if (!!creator) {
      query = `/challenges/tasks/${taskId}/multiple_choice?creator=${creator}`;
    } else {
      query = `/challenges/tasks/${taskId}/multiple_choice`;
    }
    const res = await GET(query);
    const subTasksInQuiz = useSubTasksInQuiz();
    subTasksInQuiz.value = res ?? [];

    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function updateSubTaskInQuizForAdmin(taskId: any, subTaskId: any, body: any) {
  try {
    const res = await PATCH(`/challenges/tasks/${taskId}/multiple_choice/${subTaskId}`, body);
    const user: any = useUser();
    await getSubTasksInQuiz(taskId, user?.value.id ?? "");
    
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}

export async function getSubTaskAndSolutionInQuiz(taskId: any, subTaskId: any) {
  try {
    const res = await GET(`/challenges/tasks/${taskId}/multiple_choice/${subTaskId}/solution`);
    const subTaskAndSolutionInQuiz = useSubTaskAndSolutionInQuiz();
    subTaskAndSolutionInQuiz.value = res ?? null;
    
    return [res, null];
  } catch (error) {
    return [null, error];
  }
}
