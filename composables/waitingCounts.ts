import { createCommercialStaffContext } from "./commercialStaffContext";
import { staffTransport } from "./commercialStaff";
import { holdQueue } from "./commercialHoldReview";
import { overviewTime, recordWork, waitingWork } from "./commercialOverview";

// Numbers for the navigation, so that waiting work is seen from every page.
//
// The API has no endpoint that returns these counts. Both are therefore taken
// from the lists the pages already read, once when the dashboard opens and
// again when a count is older than `MAX_AGE`. A count that could not be
// determined stays `null` and shows no number.

export type WaitingCount = { count: number; more: boolean } | null;
type WaitingCounts = {
  declarations: WaitingCount;
  commercial: WaitingCount;
  loadedAt: number;
};

export const useWaitingCounts = () =>
  useState<WaitingCounts>("waitingCounts", () => ({
    declarations: null,
    commercial: null,
    loadedAt: 0,
  }));

const PAGE = 100;
/** Declarations are listed newest first and cannot be filtered by state. */
const MAX_DECLARATION_PAGES = 5;
const MAX_AGE = 10 * 60 * 1000;

type Run = <T>(callback: () => T) => T;

async function waitingDeclarations(run: Run): Promise<WaitingCount> {
  let count = 0;
  for (let page = 0; page < MAX_DECLARATION_PAGES; page++) {
    const response: any = await run(() =>
      GET("/contracts/declarations", { limit: PAGE, offset: page * PAGE }),
    );
    const rows: any[] = Array.isArray(response?.declarations)
      ? response.declarations
      : [];
    count += rows.filter((row) => row && !row.processed_at).length;
    if (rows.length < PAGE || (page + 1) * PAGE >= (response?.total ?? 0))
      return { count, more: false };
  }
  return { count, more: true };
}

async function waitingCommercial(): Promise<WaitingCount> {
  const app = useNuxtApp();
  // A context of its own: nothing is kept beyond this one read.
  const context = createCommercialStaffContext({
    user: useUser(),
    session: useSession(),
    token: useAccessToken(),
    getToken: getAccessToken,
    run: (callback) => app.runWithContext(callback) as ReturnType<typeof callback>,
  });
  try {
    const proof = context.activate() ? context.capture() : null;
    if (!proof) return null;
    const response = await staffTransport(
      String(useRuntimeConfig().public.BASE_API_URL),
    )(
      "/shop/claims/admin/hold_queue",
      proof,
      JSON.stringify({ version: 1, limit: PAGE, cursor: null }),
    );
    if (
      response.status !== 200 ||
      response.mime.split(";")[0]!.trim() !== "application/json"
    )
      return null;
    const queue = holdQueue(JSON.parse(response.text));
    const now = overviewTime(queue.observed_at) ?? Date.now();
    const last = queue.rows.at(-1);
    return {
      count: waitingWork(recordWork(queue.rows, now)).cases,
      // Rows come earliest date first: more can only wait behind a due last row.
      more:
        !queue.exhausted &&
        !!last &&
        (overviewTime(last.review_due_at) ?? -Infinity) <= now,
    };
  } finally {
    context.dispose();
  }
}

let running: Promise<void> | null = null;

/** Reads the counts unless they are fresh. Failures leave no number. The
 * commercial page publishes its own count, so it passes `commercial: false`. */
export function loadWaitingCounts(commercial = true): Promise<void> {
  const counts = useWaitingCounts();
  if (running) return running;
  if (Date.now() - counts.value.loadedAt < MAX_AGE) return Promise.resolve();
  const app = useNuxtApp();
  const run: Run = (callback) =>
    app.runWithContext(callback) as ReturnType<typeof callback>;
  running = (async () => {
    // The ordinary request renews an expired session first; the commercial
    // read never does.
    const declarations = await waitingDeclarations(run).catch(() => null);
    const own = commercial
      ? await run(waitingCommercial).catch(() => null)
      : counts.value.commercial;
    counts.value = { declarations, commercial: own, loadedAt: Date.now() };
  })().finally(() => {
    running = null;
  });
  return running;
}
