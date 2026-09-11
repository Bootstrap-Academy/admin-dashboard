export type ModerationOwner = "backend" | "challenges";
export async function moderationAdmin(
  owner: ModerationOwner,
  operation: string,
  body: any = {},
) {
  let path = `/auth/moderation/admin/${operation}`,
    method = "POST";
  if (owner === "challenges") {
    const paths: Record<string, string> = {
      queue: "/cases",
      case: `/cases/${body.id}`,
      open: "/cases",
      decide: "/decisions",
      escalate: "/escalations",
      retention: "/retention",
    };
    if (!paths[operation]) throw new Error("Unsupported owner operation");
    path = "/challenges/moderation" + paths[operation];
    if (["queue", "case"].includes(operation)) method = "GET";
  }
  return await $fetch<any>(path, {
    baseURL: useRuntimeConfig().public.BASE_API_URL,
    method: method as any,
    ...(method === "GET"
      ? { query: operation === "queue" ? body : undefined }
      : { body }),
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    retry: 0,
    timeout: 20000,
  });
}
