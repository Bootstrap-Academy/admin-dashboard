import { createCommercialStaffContext } from "./commercialStaffContext";
import { staffTransport } from "./commercialStaff";
import { holdQueue } from "./commercialHoldReview";
import { overviewTime, recordWork, waitingWork } from "./commercialOverview";

// Numbers for the navigation, so that waiting work is seen from every page.
//
// The API has no endpoint that returns these counts. Both are therefore taken
// from the lists the pages already read, once when the dashboard loads. Every
// read of the declaration list returns names and addresses and is recorded in
// the administrative audit log, so nothing rereads it on a timer or while
// moving between pages. A page that has just saved work updates its own
// number. A count that could not be determined stays `null` and shows none,
// and the numbers of one session are never left standing for another.

export type WaitingCount = { count: number; more: boolean } | null;
type WaitingCounts = {
  declarations: WaitingCount;
  commercial: WaitingCount;
};

export const useWaitingCounts = () =>
  useState<WaitingCounts>("waitingCounts", () => ({
    declarations: null,
    commercial: null,
  }));

const PAGE = 100;
/** Declarations are listed newest first and cannot be filtered by state. */
const MAX_DECLARATION_PAGES = 5;

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
    // An answer for a session that is no longer the current one counts nothing.
    if (!context.current(proof)) return null;
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

const nothing = (): WaitingCounts => ({ declarations: null, commercial: null });
let running: Promise<void> | null = null;

/** Reads the counts; the dashboard calls this once when it loads. Failures
 * leave no number. The commercial page publishes its own count, so the
 * dashboard passes `commercial: false` when it loads on that page. */
export function loadWaitingCounts(commercial = true): Promise<void> {
  const counts = useWaitingCounts();
  if (running) return running;
  const user = useUser(),
    session = useSession(),
    who = () => `${user.value?.id ?? ""}/${session.value?.id ?? ""}`,
    owner = who();
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
    counts.value =
      who() === owner ? { declarations, commercial: own } : nothing();
  })().finally(() => {
    running = null;
  });
  return running;
}

/** For the navigation bar: reads the counts once when the dashboard loads and
 * takes them away as soon as another account or session is the current one. */
export function useDashboardCounts(commercial: boolean) {
  const counts = useWaitingCounts(),
    user = useUser(),
    session = useSession();
  watch(
    () => `${user.value?.id ?? ""}/${session.value?.id ?? ""}`,
    () => {
      counts.value = nothing();
    },
    { flush: "sync" },
  );
  onMounted(() => loadWaitingCounts(commercial));
}
