import { reactive, readonly } from "vue";
import { holdNativeTime } from "./commercialHoldReview";
import {
  staffUuid,
  type CommercialStaffContext,
  type StaffProof,
} from "./commercialStaffContext";
import type { StaffTransport } from "./commercialStaff";

export const retentionFamilies = [
  "statements",
  "archives",
  "retained_owner_associations",
  "invoice_identity_reviews",
  "unqualified_invoice_owner_observations",
] as const;
export type RetentionFamily = (typeof retentionFamilies)[number];
export type RetentionRow = Readonly<Record<string, string | boolean | null>>;
export type RetentionCursor = Readonly<{
  protocol: 1;
  family: RetentionFamily;
  after: Readonly<Record<string, string>>;
}>;
export type RetentionPage = Readonly<{
  protocol: 1;
  family: RetentionFamily;
  limit: 100;
  observed_at: string;
  semantics: "live_queue";
  rows: readonly RetentionRow[];
  next_cursor: RetentionCursor | null;
  exhausted: boolean;
}>;
const fail = (): never => {
  throw Error("schema");
};
const object = (v: unknown, keys: readonly string[]) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail();
  const value = v as Record<string, unknown>;
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    return fail();
  return value;
};
const text = (v: unknown): string => (typeof v === "string" ? v : fail());
const boolean = (v: unknown): boolean => (typeof v === "boolean" ? v : fail());
const uuid = (v: unknown): string => (staffUuid(v) ? v : fail());
const nil = (v: unknown): null => (v === null ? null : fail());
function optional<T>(parse: (v: unknown) => T) {
  return (v: unknown): T | null => (v === null ? null : parse(v));
}
function choice(choices: readonly string[]) {
  return (v: unknown): string =>
    choices.includes(text(v)) ? (v as string) : fail();
}
const historical = (v: unknown) => holdNativeTime(v);
type FieldParser = (v: unknown) => string | boolean | null;
const schemas: Record<RetentionFamily, Record<string, FieldParser>> = {
  statements: {
    number: text,
    review_due_at: historical,
    authorized: boolean,
    assessment_json: optional(text),
    historical_staff_assertion: optional(historical),
    issued_at: historical,
  },
  archives: {
    number: text,
    kind: choice(["invoice", "credit_note", "final_statement"]),
    source: choice(["record_disposal", "unrecorded_archive"]),
    recorded_at: historical,
    review_due_at: historical,
    disposal_authorized: boolean,
    assessment_json: optional(text),
    disposal_started_at: optional(historical),
    file_removed_at: nil,
  },
  retained_owner_associations: {
    number: text,
    kind: text,
    subject: uuid,
    observed_at: historical,
    review_due_at: historical,
    source: text,
  },
  invoice_identity_reviews: {
    number: text,
    reason: text,
    source_key: text,
    observed_at: historical,
    disposition: choice(["pending_review"]),
    evidence_json: text,
  },
  unqualified_invoice_owner_observations: {
    number: text,
    subject: uuid,
    basis: text,
    evidence_hash: text,
    evidence_json: text,
    qualified: (v) => (v === false ? false : fail()),
    observed_at: historical,
  },
};
const primaryKeys: Record<RetentionFamily, readonly string[]> = {
  statements: ["number"],
  archives: ["number", "kind"],
  retained_owner_associations: ["number", "kind", "subject"],
  invoice_identity_reviews: ["number", "reason", "source_key"],
  unqualified_invoice_owner_observations: [
    "number",
    "subject",
    "basis",
    "evidence_hash",
  ],
};
export const retentionFields = (family: RetentionFamily): readonly string[] =>
  Object.keys(schemas[family]);
const familyValue = (v: unknown): RetentionFamily =>
  retentionFamilies.includes(v as RetentionFamily)
    ? (v as RetentionFamily)
    : fail();
export function retentionRowKey(
  family: RetentionFamily,
  row: RetentionRow,
): string {
  return JSON.stringify([
    family,
    ...primaryKeys[family].map((key) => row[key]),
  ]);
}
function row(v: unknown, family: RetentionFamily): RetentionRow {
  const schema = schemas[family],
    value = object(v, Object.keys(schema));
  return Object.freeze(
    Object.fromEntries(
      Object.entries(schema).map(([key, parse]) => [key, parse(value[key])]),
    ),
  );
}
function afterRow(value: RetentionRow, family: RetentionFamily) {
  return {
    at: value[
      family === "invoice_identity_reviews" ||
      family === "unqualified_invoice_owner_observations"
        ? "observed_at"
        : "review_due_at"
    ],
    ...Object.fromEntries(primaryKeys[family].map((key) => [key, value[key]])),
  };
}
function cursor(v: unknown, family: RetentionFamily): RetentionCursor {
  const value = object(v, ["protocol", "family", "after"]);
  if (value.protocol !== 1 || value.family !== family) return fail();
  const after = object(value.after, ["at", ...primaryKeys[family]]);
  holdNativeTime(after.at);
  for (const key of primaryKeys[family])
    key === "subject" ? uuid(after[key]) : text(after[key]);
  return Object.freeze({
    ...value,
    after: Object.freeze({ ...after }),
  }) as RetentionCursor;
}
export function retentionPage(
  v: unknown,
  family: RetentionFamily,
): RetentionPage {
  familyValue(family);
  const value = object(v, [
    "protocol",
    "family",
    "limit",
    "observed_at",
    "semantics",
    "rows",
    "next_cursor",
    "exhausted",
  ]);
  if (
    value.protocol !== 1 ||
    value.family !== family ||
    value.limit !== 100 ||
    value.semantics !== "live_queue" ||
    !Array.isArray(value.rows) ||
    value.rows.length > 100
  )
    return fail();
  const observed = holdNativeTime(value.observed_at, true),
    rows = value.rows.map((v) => row(v, family));
  const exhausted = boolean(value.exhausted);
  if (new Set(rows.map((r) => retentionRowKey(family, r))).size !== rows.length)
    return fail();
  const next =
    value.next_cursor === null ? null : cursor(value.next_cursor, family);
  if (exhausted ? next !== null : next === null || rows.length !== 100)
    return fail();
  if (next) {
    const last = afterRow(rows[rows.length - 1], family);
    if (Object.entries(last).some(([key, val]) => next.after[key] !== val))
      return fail();
  }
  // Display server order. This client does not reproduce database collation or
  // infer lossless cross-page coverage from these qualified local observations.
  return Object.freeze({
    protocol: 1,
    family,
    limit: 100,
    observed_at: observed,
    semantics: "live_queue",
    rows: Object.freeze(rows),
    next_cursor: next,
    exhausted,
  });
}
export function createCommercialRetentionPage(
  context: CommercialStaffContext,
  transport: StaffTransport,
) {
  let alive = true,
    familyRevision = 0,
    requestRevision = 0;
  let pageProof: StaffProof | null = null;
  const state = reactive({
    family: "statements" as RetentionFamily,
    page: null as RetentionPage | null,
    busy: false,
    error: "",
  });
  const clear = (error = "") => {
    requestRevision++;
    pageProof = null;
    state.page = null;
    state.busy = false;
    state.error = error;
  };
  const unlisten = context.onInvalidate(() => clear("authority"));
  function selectFamily(value: unknown) {
    if (!alive) return;
    const family = familyValue(value);
    if (family === state.family) return;
    familyRevision++;
    state.family = family;
    clear();
  }
  async function read(mode: "first" | "next" | "restart") {
    if (!alive) return;
    const family = state.family;
    let next: RetentionCursor | null = null,
      previousProof: StaffProof | null = null;
    if (mode === "next") {
      previousProof = pageProof;
      if (
        !previousProof ||
        !context.current(previousProof) ||
        !state.page ||
        state.page.family !== family ||
        !state.page.next_cursor
      )
        return;
      // Copy every qualified literal member before clearing the old observation.
      next = cursor(state.page.next_cursor, family);
    }
    clear();
    if (!context.activate()) {
      state.error = "authority";
      return;
    }
    const proof = context.capture();
    if (!proof || (previousProof && !context.current(previousProof))) {
      state.error = "authority";
      return;
    }
    const request = requestRevision,
      selected = familyRevision;
    const current = () =>
      alive &&
      request === requestRevision &&
      selected === familyRevision &&
      family === state.family &&
      context.current(proof);
    state.busy = true;
    try {
      const response = await transport(
        "/shop/claims/admin/retention_page",
        proof,
        { family, limit: 100, cursor: next },
      );
      context.reject(proof, response.status); // Shared proof precedes child-local lifetime.
      if (!alive) return;
      if (!current()) return;
      if (response.status !== 200)
        throw Object.assign(Error("request"), { status: response.status });
      if (response.mime.split(";")[0].trim() !== "application/json")
        throw Error("schema");
      const value = retentionPage(JSON.parse(response.text), family);
      if (!current()) return;
      pageProof = proof;
      state.page = value;
    } catch (error) {
      if (!current()) return;
      state.error =
        (error as { status?: number })?.status === 400
          ? "malformed"
          : "unavailable";
    } finally {
      if (current()) state.busy = false;
    }
  }
  return {
    state: readonly(state),
    selectFamily,
    first: () => read("first"),
    next: () => read("next"),
    restart: () => read("restart"),
    dispose() {
      if (!alive) return;
      alive = false;
      clear();
      unlisten();
    },
  };
}
