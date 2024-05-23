import { useState } from "#app";

export const useChallengeCategories = () =>
  useState<any[]>("challenge-categories", () => []);

export const useChallengeCategory = () =>
  useState<any>("challenge-category", () => null);

export async function getChallengeCategory(id: string) {
  try {
    const response = await GET(`/challenges/categories/${id}`);

    const challengeCategory = useChallengeCategory();
    challengeCategory.value = response ?? null;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function createChallengeCategory(body: any) {
  try {
    const response = await POST("/challenges/categories", body);

    getChallengeCategories();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function editChallengeCategory(id: string, body: any) {
  try {
    const response = await PATCH(`/challenges/categories/${id}`, body);

    getChallengeCategories();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function deleteChallengeCategory(id: string) {
  try {
    const response = await DELETE(`/challenges/categories/${id}`);

    getChallengeCategories();

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function getChallengeCategories() {
  try {
    const response = await GET(`/challenges/categories`);

    const ChallengeCategories = useChallengeCategories();
    ChallengeCategories.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
