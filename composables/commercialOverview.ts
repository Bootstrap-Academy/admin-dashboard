import type { StaffCase } from "./commercialStaff";

// What the commercial page and the navigation count as waiting.
//
// The case list alone cannot tell: its `due_at` also folds in the review date
// of the case itself, and no dashboard action moves that date. Reviews of
// retained records carry their own date, and recording one moves it. They are
// therefore the dated work an administrator can finish here.

const stamp =
  /^(\d{4,7})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?(Z|[+-]\d\d(?::?\d\d)?)( BC)?$/;

/** Milliseconds since the epoch. PostgreSQL infinities and dates outside the
 * range of `Date` become ±Infinity; an unreadable value is `null`. */
export function overviewTime(value: string): number | null {
  if (value === "infinity") return Infinity;
  if (value === "-infinity") return -Infinity;
  const match = stamp.exec(value);
  if (!match) return null;
  if (match[9]) return -Infinity;
  const zone = match[8]!;
  let offset = 0;
  if (zone !== "Z") {
    const digits = zone.slice(1).replace(":", "");
    offset =
      (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || 0)) *
      (zone.startsWith("-") ? -1 : 1);
  }
  const date = new Date(0);
  date.setUTCFullYear(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  date.setUTCHours(
    Number(match[4]),
    Number(match[5]),
    Number(match[6] || 0),
    Number((match[7] || "").padEnd(3, "0").slice(0, 3)),
  );
  const time = date.getTime() - offset * 60000;
  return Number.isNaN(time) ? Infinity : time;
}

export const OVERVIEW_TIME_ZONE = "Europe/Berlin";

/** A calendar day in the zone the business works in, or "" without one. */
export function overviewDate(time: number | null, locale: string): string {
  if (time === null || !Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: OVERVIEW_TIME_ZONE,
  }).format(new Date(time));
}

export type CaseWork = {
  /** Retained records of the case on the loaded list. */
  records: number;
  /** Records whose review date has passed. */
  due: number;
  /** The earliest passed review date. */
  since: number | null;
  /** The earliest review date that still lies ahead. */
  next: number | null;
};
type DatedRecord = { case_id: string; review_due_at: string };

/** Review work per case. A date that cannot be read counts as due, so that
 * the record is shown rather than silently skipped. */
export function recordWork(
  rows: readonly DatedRecord[],
  now: number,
): Map<string, CaseWork> {
  const result = new Map<string, CaseWork>();
  for (const row of rows) {
    const work = result.get(row.case_id) ?? {
      records: 0,
      due: 0,
      since: null,
      next: null,
    };
    const time = overviewTime(row.review_due_at);
    work.records++;
    if (time === null || time <= now) {
      work.due++;
      if (time !== null)
        work.since = work.since === null ? time : Math.min(work.since, time);
    } else if (time !== Infinity)
      work.next = work.next === null ? time : Math.min(work.next, time);
    result.set(row.case_id, work);
  }
  return result;
}

export type Waiting = {
  /** Cases with at least one review that is due. */
  cases: number;
  since: number | null;
  next: number | null;
};
export function waitingWork(work: ReadonlyMap<string, CaseWork>): Waiting {
  const result: Waiting = { cases: 0, since: null, next: null };
  for (const item of work.values()) {
    if (item.due > 0) {
      result.cases++;
      if (item.since !== null)
        result.since =
          result.since === null
            ? item.since
            : Math.min(result.since, item.since);
    }
    if (item.next !== null)
      result.next =
        result.next === null ? item.next : Math.min(result.next, item.next);
  }
  return result;
}

export const caseStates = ["due", "later", "clear", "closed"] as const;
export type CaseState = (typeof caseStates)[number];
export type CaseLine = {
  row: StaffCase;
  state: CaseState;
  work: CaseWork | null;
};

const order: Record<CaseState, number> = {
  due: 0,
  later: 1,
  clear: 2,
  closed: 3,
};
const first = (value: number | null) => (value === null ? -Infinity : value);

/** The table rows: what waits comes first, longest waiting on top. */
export function caseLines(
  cases: readonly StaffCase[],
  work: ReadonlyMap<string, CaseWork>,
): CaseLine[] {
  return cases
    .map((row, index) => {
      const own = work.get(row.id) ?? null;
      const state: CaseState = own?.due
        ? "due"
        : row.closed_at !== null
          ? "closed"
          : own && own.next !== null
            ? "later"
            : "clear";
      return { row, state, work: own, index };
    })
    .sort(
      (a, b) =>
        order[a.state] - order[b.state] ||
        (a.state === "due"
          ? first(a.work!.since) - first(b.work!.since)
          : a.state === "later"
            ? a.work!.next! - b.work!.next!
            : 0) ||
        a.index - b.index,
    )
    .map(({ row, state, work: own }) => ({ row, state, work: own }));
}
