import { reactive } from "vue";
import {
  staffUuid,
  type CommercialStaffContext,
  type StaffProof,
} from "./commercialStaffContext";
import type { StaffTransport } from "./commercialStaff";

const fail = (): never => {
  throw Error("schema");
};
const obj = (v: unknown, keys: string[]) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail();
  const r = v as Record<string, unknown>;
  if (
    Object.keys(r).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(r, k))
  )
    return fail();
  return r;
};
const str = (v: unknown): string => (typeof v === "string" ? v : fail());
const uuid = (v: unknown): string => (staffUuid(v) ? v : fail());
const maxVersion = 9223372036854775807n;
const version = (v: unknown) => {
  const s = str(v);
  if (!/^(0|[1-9]\d*)$/.test(s) || s.length > 19 || BigInt(s) > maxVersion)
    return fail();
  return s;
};
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const day = 86400000000n,
  second = 1000000n;
const floor = (a: bigint, b: bigint) => a / b - (a % b < 0n ? 1n : 0n);
// Gregorian civil-day arithmetic; no floating-point epoch or browser Date range.
function civil(y: bigint, m: bigint, d: bigint): bigint {
  y -= m <= 2n ? 1n : 0n;
  const era = floor(y, 400n),
    yo = y - era * 400n;
  const doy = (153n * (m + (m > 2n ? -3n : 9n)) + 2n) / 5n + d - 1n;
  return era * 146097n + yo * 365n + yo / 4n - yo / 100n + doy - 719468n;
}
function calendar(days: bigint) {
  const z = days + 719468n,
    era = floor(z, 146097n),
    doe = z - era * 146097n;
  const yo = (doe - doe / 1460n + doe / 36524n - doe / 146096n) / 365n;
  let y = yo + era * 400n;
  const doy = doe - (365n * yo + yo / 4n - yo / 100n),
    mp = (5n * doy + 2n) / 153n;
  const d = doy - (153n * mp + 2n) / 5n + 1n,
    m = mp + (mp < 10n ? 3n : -9n);
  y += m <= 2n ? 1n : 0n;
  return { y, m, d };
}
const epoch = civil(2000n, 1n, 1n);
function bounded(value: bigint) {
  if (value < -211813488000000000n || value >= 9223371331200000000n)
    return fail();
  return value;
}
const pad = (v: bigint, n = 2) => v.toString().padStart(n, "0");
export function holdNativeText(value: bigint): string {
  bounded(value);
  const days = floor(value, day),
    t = value - days * day;
  const { y, m, d } = calendar(days + epoch),
    sec = t / second;
  const fraction = (t % second).toString().padStart(6, "0").replace(/0+$/, "");
  return `${pad(y <= 0n ? 1n - y : y, 4)}-${pad(m)}-${pad(d)} ${pad(sec / 3600n)}:${pad((sec / 60n) % 60n)}:${pad(sec % 60n)}${fraction ? "." + fraction : ""}+00${y <= 0n ? " BC" : ""}`;
}
function fields(
  y: bigint,
  m: bigint,
  d: bigint,
  h: bigint,
  min: bigint,
  s: bigint,
  f: bigint,
  offset: bigint,
) {
  if (m < 1n || m > 12n || d < 1n || d > 31n || h > 24n || min > 59n || s > 60n)
    return fail();
  const days = civil(y, m, d),
    decoded = calendar(days);
  if (decoded.y !== y || decoded.m !== m || decoded.d !== d) return fail();
  const t = (h * 3600n + min * 60n + s) * second + f;
  if (t > day) return fail();
  return bounded((days - epoch) * day + t - offset * second);
}
export function holdRequestTime(v: unknown): bigint {
  const m =
    /^(\d{4,6})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d{1,6}))?)?(Z|([+-])(\d\d)(?::?(\d\d))?)$/.exec(
      str(v),
    );
  if (!m || BigInt(m[1]) === 0n) return fail();
  const oh = BigInt(m[10] || "0"),
    om = BigInt(m[11] || "0");
  if (oh > 15n || om > 59n) return fail();
  const offset = (oh * 3600n + om * 60n) * (m[9] === "-" ? -1n : 1n);
  return fields(
    BigInt(m[1]),
    BigInt(m[2]),
    BigInt(m[3]),
    BigInt(m[4]),
    BigInt(m[5]),
    BigInt(m[6] || "0"),
    BigInt((m[7] || "").padEnd(6, "0")),
    offset,
  );
}
export function holdNativeTime(v: unknown, finite = false): string {
  const text = str(v);
  if (!finite && (text === "infinity" || text === "-infinity")) return text;
  const m =
    /^(\d{4,6})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d)(?:\.(\d{1,6}))?\+00( BC)?$/.exec(
      text,
    );
  if (!m || BigInt(m[1]) === 0n) return fail();
  const y = BigInt(m[1]);
  const value = fields(
    m[8] ? 1n - y : y,
    BigInt(m[2]),
    BigInt(m[3]),
    BigInt(m[4]),
    BigInt(m[5]),
    BigInt(m[6]),
    BigInt((m[7] || "").padEnd(6, "0")),
    0n,
  );
  if (holdNativeText(value) !== text) return fail();
  return text;
}
export const holdKinds = [
  "financial_document",
  "contract_declaration",
  "renewal_agreement",
  "legacy_renewal",
] as const;
export type HoldKind = (typeof holdKinds)[number];
export type Hold = { kind: HoldKind; record_id: string };
function hold(v: unknown): Hold {
  const r = obj(v, ["kind", "record_id"]);
  if (!holdKinds.includes(r.kind as HoldKind)) return fail();
  const id =
    r.kind === "financial_document" ? str(r.record_id) : uuid(r.record_id);
  if (!id) return fail();
  return { kind: r.kind as HoldKind, record_id: id };
}
export type HoldCursor = {
  review_due_at: string;
  kind: HoldKind;
  case_id: string;
  record_id: string;
  incarnation_id: string;
};
function cursor(v: unknown): HoldCursor {
  const r = obj(v, [
      "review_due_at",
      "kind",
      "case_id",
      "record_id",
      "incarnation_id",
    ]),
    h = hold({ kind: r.kind, record_id: r.record_id });
  return {
    review_due_at: holdNativeTime(r.review_due_at),
    kind: h.kind,
    case_id: uuid(r.case_id),
    record_id: h.record_id,
    incarnation_id: uuid(r.incarnation_id),
  };
}
function latest(v: unknown) {
  const r = obj(v, [
    "command_id",
    "actor",
    "recorded_at",
    "assessment",
    "review_scope",
    "previous_review_version",
    "previous_review_due_at",
    "review_version",
    "next_review_at",
  ]);
  if (r.review_scope !== "entire_existing_hold") return fail();
  return {
    command_id: uuid(r.command_id),
    actor: uuid(r.actor),
    recorded_at: holdNativeTime(r.recorded_at, true),
    assessment: str(r.assessment),
    review_scope: "entire_existing_hold" as const,
    previous_review_version: version(r.previous_review_version),
    previous_review_due_at: holdNativeTime(r.previous_review_due_at),
    review_version: version(r.review_version),
    next_review_at: holdNativeTime(r.next_review_at, true),
  };
}
export type HoldRow = {
  case_id: string;
  subject: string;
  hold: Hold;
  incarnation_id: string;
  review_version: string;
  review_due_at: string;
  basis: string;
  last_review: ReturnType<typeof latest> | null;
};
function row(v: unknown): HoldRow {
  const r = obj(v, [
    "case_id",
    "subject",
    "hold",
    "incarnation_id",
    "review_version",
    "review_due_at",
    "basis",
    "last_review",
  ]);
  const parsed = {
    case_id: uuid(r.case_id),
    subject: uuid(r.subject),
    hold: hold(r.hold),
    incarnation_id: uuid(r.incarnation_id),
    review_version: version(r.review_version),
    review_due_at: holdNativeTime(r.review_due_at),
    basis: str(r.basis),
    last_review: r.last_review === null ? null : latest(r.last_review),
  };
  const l = parsed.last_review;
  if (
    parsed.review_version === "0"
      ? l !== null
      : !l ||
        l.review_version !== parsed.review_version ||
        BigInt(l.previous_review_version) + 1n !== BigInt(l.review_version) ||
        l.next_review_at !== parsed.review_due_at
  )
    return fail();
  return parsed;
}
export const holdRowKey = (r: HoldRow) =>
  JSON.stringify([
    r.case_id,
    r.subject,
    r.hold.kind,
    r.hold.record_id,
    r.incarnation_id,
    r.review_version,
    r.review_due_at,
  ]);
const rowCursor = (r: HoldRow): HoldCursor => ({
  review_due_at: r.review_due_at,
  kind: r.hold.kind,
  case_id: r.case_id,
  record_id: r.hold.record_id,
  incarnation_id: r.incarnation_id,
});
export function holdQueue(v: unknown, limit = 100) {
  const r = obj(v, [
    "version",
    "queue",
    "mode",
    "observed_at",
    "rows",
    "next_cursor",
    "exhausted",
  ]);
  if (
    r.version !== 1 ||
    r.queue !== "four_existing_hold_families" ||
    r.mode !== "live" ||
    typeof r.exhausted !== "boolean" ||
    !Array.isArray(r.rows) ||
    r.rows.length > limit
  )
    return fail();
  const parsed = r.rows.map(row),
    next = r.next_cursor === null ? null : cursor(r.next_cursor);
  if (
    new Set(parsed.map(holdRowKey)).size !== parsed.length ||
    (r.exhausted
      ? next !== null
      : !next ||
        parsed.length !== limit ||
        !same(next, rowCursor(parsed[parsed.length - 1])))
  )
    return fail();
  return {
    observed_at: holdNativeTime(r.observed_at, true),
    rows: parsed,
    next_cursor: next,
    exhausted: r.exhausted,
  };
}
export function holdAssessment(v: unknown): string {
  const text = str(v),
    trimmed = text.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
  if (Array.from(trimmed).length < 20 || /[\uD800-\uDFFF]/u.test(text))
    return fail();
  return text;
}
export function holdRequest(v: unknown) {
  const r = obj(v, [
      "version",
      "command_id",
      "case_id",
      "subject",
      "hold",
      "expected",
      "decision",
      "review_scope",
      "assessment",
      "next_review_at",
    ]),
    e = obj(r.expected, ["incarnation_id", "review_version"]);
  if (
    r.version !== 1 ||
    r.decision !== "keep" ||
    r.review_scope !== "entire_existing_hold" ||
    !str(r.next_review_at)
  )
    return fail();
  return {
    version: 1 as const,
    command_id: uuid(r.command_id),
    case_id: uuid(r.case_id),
    subject: uuid(r.subject),
    hold: hold(r.hold),
    expected: {
      incarnation_id: uuid(e.incarnation_id),
      review_version: version(e.review_version),
    },
    decision: "keep" as const,
    review_scope: "entire_existing_hold" as const,
    assessment: holdAssessment(r.assessment),
    next_review_at: str(r.next_review_at),
  };
}
export type HoldRequest = ReturnType<typeof holdRequest>;
export function holdReceipt(v: unknown, request: HoldRequest) {
  const r = obj(v, [
    "version",
    "command_id",
    "case_id",
    "subject",
    "hold",
    "incarnation_id",
    "previous_review_version",
    "review_version",
    "previous_review_due_at",
    "next_review_at",
    "recorded_at",
    "status",
    "hold_kept",
    "record_deleted",
    "claims_satisfied",
  ]);
  const h = hold(r.hold),
    previous = version(r.previous_review_version),
    next = version(r.review_version);
  if (
    r.version !== 1 ||
    uuid(r.command_id) !== request.command_id ||
    uuid(r.case_id) !== request.case_id ||
    uuid(r.subject) !== request.subject ||
    !same(h, request.hold) ||
    uuid(r.incarnation_id) !== request.expected.incarnation_id ||
    previous !== request.expected.review_version ||
    BigInt(previous) + 1n !== BigInt(next) ||
    r.status !== "review_recorded" ||
    r.hold_kept !== true ||
    r.record_deleted !== false ||
    r.claims_satisfied !== false
  )
    return fail();
  const date = holdNativeTime(r.next_review_at, true);
  if (holdNativeText(holdRequestTime(request.next_review_at)) !== date)
    return fail();
  return {
    version: 1 as const,
    command_id: request.command_id,
    case_id: request.case_id,
    subject: request.subject,
    hold: h,
    incarnation_id: request.expected.incarnation_id,
    previous_review_version: previous,
    review_version: next,
    previous_review_due_at: holdNativeTime(r.previous_review_due_at),
    next_review_at: date,
    recorded_at: holdNativeTime(r.recorded_at, true),
    status: "review_recorded" as const,
    hold_kept: true,
    record_deleted: false,
    claims_satisfied: false,
  };
}
type Receipt = ReturnType<typeof holdReceipt>;
export type HoldSaved = {
  schema_version: 1;
  actor: string;
  body_json: string;
  uncertain: boolean;
  confirmed: boolean;
  receipts: Receipt[];
};
export function holdSaved(v: unknown): HoldSaved {
  const r = obj(v, [
      "schema_version",
      "actor",
      "body_json",
      "uncertain",
      "confirmed",
      "receipts",
    ]),
    body = str(r.body_json),
    request = holdRequest(JSON.parse(body));
  if (
    r.schema_version !== 1 ||
    typeof r.uncertain !== "boolean" ||
    typeof r.confirmed !== "boolean" ||
    !Array.isArray(r.receipts)
  )
    return fail();
  const receipts = r.receipts.map((v) => holdReceipt(v, request));
  if (r.confirmed && (!r.uncertain || receipts.length === 0)) return fail();
  return {
    schema_version: 1,
    actor: uuid(r.actor),
    body_json: body,
    uncertain: r.uncertain,
    confirmed: r.confirmed,
    receipts,
  };
}
const prefix = "bootstrap.staff-hold-review.v1.";
const storageKey = (id: string) => prefix + uuid(id);
const logical = (r: HoldRequest) =>
  JSON.stringify([r.case_id, r.hold.kind, r.hold.record_id]);
export type HoldStorage = Pick<
  Storage,
  "length" | "key" | "getItem" | "setItem"
>;
type HoldImportTicket = Readonly<{ ordinal: number }>;
export function createCommercialHoldReview(
  context: CommercialStaffContext,
  transport: StaffTransport,
  storage: () => HoldStorage,
  newId: () => string = () => crypto.randomUUID(),
) {
  let alive = true,
    queueRevision = 0,
    formRevision = 0,
    savedRevision = 0,
    importOrdinal = 0,
    activeImport: HoldImportTicket | null = null;
  const invalidateImports = () => {
    importOrdinal++;
    activeImport = null;
  };
  const beginImport = () => {
    invalidateImports();
    if (!alive || state.sendBusy) return null;
    activeImport = Object.freeze({ ordinal: importOrdinal });
    return activeImport;
  };
  const importCurrent = (ticket: HoldImportTicket | null) =>
    alive && !state.sendBusy && ticket !== null && activeImport === ticket;
  const finishImport = (ticket: HoldImportTicket | null) => {
    if (!importCurrent(ticket)) return false;
    invalidateImports();
    return true;
  };
  const state = reactive({
    queue: null as ReturnType<typeof holdQueue> | null,
    selected: null as HoldRow | null,
    assessment: "",
    nextDate: "",
    scope: false,
    queueBusy: false,
    sendBusy: false,
    error: "",
    authority: false,
    records: [] as HoldSaved[],
    saved: null as HoldSaved | null,
    receipt: null as Receipt | null,
    receiptUnsaved: false,
  });
  const clearForm = () => {
    formRevision++;
    state.selected = null;
    state.assessment = "";
    state.nextDate = "";
    state.scope = false;
  };
  const clear = () => {
    invalidateImports();
    queueRevision++;
    savedRevision++;
    clearForm();
    state.queue = null;
    state.queueBusy = false;
    state.authority = false;
    state.receipt = null;
    state.receiptUnsaved = false;
    state.error = "authority";
  };
  const unlisten = context.onInvalidate(clear);
  const readRecord = (id: string) => {
    const raw = storage().getItem(storageKey(id));
    if (raw === null) return null;
    const r = holdSaved(JSON.parse(raw));
    if (holdRequest(JSON.parse(r.body_json)).command_id !== id) return fail();
    return r;
  };
  const save = (r: HoldSaved) => {
    const id = holdRequest(JSON.parse(r.body_json)).command_id,
      old = readRecord(id);
    if (old && (old.actor !== r.actor || old.body_json !== r.body_json))
      return fail();
    if (
      old &&
      ((old.uncertain && !r.uncertain) ||
        old.receipts.some(
          (receipt) => !r.receipts.some((saved) => same(saved, receipt)),
        ))
    )
      return fail();
    const raw = JSON.stringify(r);
    storage().setItem(storageKey(id), raw);
    if (storage().getItem(storageKey(id)) !== raw) throw Error("storage");
  };
  const list = () => {
    const values: HoldSaved[] = [],
      s = storage();
    for (let n = 0; n < s.length; n++) {
      const key = s.key(n);
      if (key?.startsWith(prefix) && staffUuid(key.slice(prefix.length))) {
        const r = readRecord(key.slice(prefix.length));
        if (r) values.push(r);
      }
    }
    state.records = values;
    return values;
  };
  const checked = () => {
    if (!state.saved) return fail();
    const expected = holdSaved(JSON.parse(JSON.stringify(state.saved))),
      request = holdRequest(JSON.parse(expected.body_json)),
      current = readRecord(request.command_id);
    if (!current || !same(current, expected)) throw Error("storage");
    return { saved: current, request };
  };
  const selectedSaved = (r: HoldSaved | null, fromCurrentImport = false) => {
    if (!fromCurrentImport) invalidateImports();
    savedRevision++;
    state.saved = r;
    state.receipt = null;
    state.receiptUnsaved = false;
    state.error = "";
  };
  const proof = () => {
    if (!context.activate()) {
      clear();
      return null;
    }
    const p = context.capture();
    if (p) state.authority = true;
    return p;
  };
  const current = (p: StaffProof, rev: number) =>
    alive && context.current(p) && rev === savedRevision;
  async function response(
    path: "/shop/claims/admin/hold_queue" | "/shop/claims/admin/hold_review",
    p: StaffProof,
    body: string,
  ) {
    const r = await transport(path, p, body);
    context.reject(p, r.status);
    if (r.status !== 200) throw Error("unconfirmed");
    if (r.mime.split(";")[0].trim() !== "application/json") return fail();
    return JSON.parse(r.text) as unknown;
  }
  return {
    state,
    beginImport,
    finishImport,
    importError(ticket: HoldImportTicket | null) {
      if (importCurrent(ticket)) state.error = "import";
    },
    loadSaved() {
      if (!alive) return;
      try {
        list();
        state.error = "";
      } catch {
        state.error = "storage";
      }
    },
    async queue(next = false) {
      if (!alive) return;
      const c = next ? state.queue?.next_cursor : null;
      if (next && !c) return;
      const body = JSON.stringify({
          version: 1,
          limit: 100,
          cursor: c ? cursor(c) : null,
        }),
        p = proof();
      if (!p) return;
      const rev = ++queueRevision;
      clearForm();
      state.queue = null;
      state.queueBusy = true;
      state.error = "";
      try {
        const r = await response("/shop/claims/admin/hold_queue", p, body);
        if (alive && context.current(p) && rev === queueRevision)
          state.queue = holdQueue(r);
      } catch {
        if (alive && context.current(p) && rev === queueRevision)
          state.error = "unavailable";
      } finally {
        if (alive && rev === queueRevision) state.queueBusy = false;
      }
    },
    select(value: HoldRow) {
      if (
        !alive ||
        !state.queue?.rows.some((r) => holdRowKey(r) === holdRowKey(value))
      )
        return;
      clearForm();
      state.selected = row(JSON.parse(JSON.stringify(value)));
      state.error = "";
    },
    edit(assessment: string, nextDate: string, scope: boolean) {
      formRevision++;
      state.assessment = assessment;
      state.nextDate = nextDate;
      state.scope = scope;
    },
    prepare() {
      if (!alive || state.sendBusy) return;
      invalidateImports();
      try {
        const p = proof(),
          selected =
            state.selected && row(JSON.parse(JSON.stringify(state.selected))),
          rev = formRevision;
        if (
          !p ||
          !selected ||
          !state.scope ||
          !state.queue?.rows.some((r) => same(r, selected)) ||
          BigInt(selected.review_version) === maxVersion
        )
          return fail();
        holdRequestTime(state.nextDate);
        const request = holdRequest({
          version: 1,
          command_id: uuid(newId()),
          case_id: selected.case_id,
          subject: selected.subject,
          hold: selected.hold,
          expected: {
            incarnation_id: selected.incarnation_id,
            review_version: selected.review_version,
          },
          decision: "keep",
          review_scope: "entire_existing_hold",
          assessment: state.assessment,
          next_review_at: state.nextDate,
        });
        if (
          list().some(
            (r) =>
              !r.confirmed &&
              logical(holdRequest(JSON.parse(r.body_json))) ===
                logical(request),
          )
        )
          throw Error("pending");
        if (!context.current(p) || rev !== formRevision) return;
        const record: HoldSaved = {
          schema_version: 1,
          actor: p.uid,
          body_json: JSON.stringify(request),
          uncertain: false,
          confirmed: false,
          receipts: [],
        };
        save(record);
        selectedSaved(record);
        list();
      } catch (e) {
        state.error =
          e instanceof Error && e.message === "pending" ? "pending" : "prepare";
      }
    },
    selectSaved(id: string) {
      if (!alive || state.sendBusy) return;
      invalidateImports();
      try {
        selectedSaved(readRecord(id));
      } catch {
        state.error = "storage";
      }
    },
    importFile(raw: string, ticket?: HoldImportTicket | null) {
      // File reads are local history inspection, not a request for staff authority.
      const ownTicket = ticket === undefined,
        currentTicket = ownTicket ? beginImport() : ticket;
      if (!importCurrent(currentTicket)) return;
      try {
        const record = holdSaved(JSON.parse(raw)),
          id = holdRequest(JSON.parse(record.body_json)).command_id,
          old = readRecord(id);
        if (
          old &&
          (old.body_json !== record.body_json || old.actor !== record.actor)
        )
          return fail();
        // A downloaded file cannot prove what happened after it was written.
        record.uncertain = true;
        record.confirmed = false;
        if (old) record.receipts = old.receipts;
        if (!importCurrent(currentTicket)) return;
        save(record);
        if (!importCurrent(currentTicket)) return;
        selectedSaved(record, true);
        list();
      } catch {
        if (importCurrent(currentTicket)) state.error = "import";
      } finally {
        if (ownTicket) finishImport(currentTicket);
      }
    },
    exportFile() {
      try {
        return JSON.stringify(checked().saved, null, 2);
      } catch {
        state.error = "storage";
        return null;
      }
    },
    async send() {
      if (!alive || state.sendBusy) return;
      // An intervening attempt stays relevant even after sendBusy becomes false.
      invalidateImports();
      let p: StaffProof | null = null,
        rev = savedRevision;
      try {
        const { saved, request } = checked();
        p = proof();
        rev = savedRevision;
        if (!p) return;
        if (p.uid !== saved.actor) {
          state.error = "actor";
          return;
        }
        // This is exact command recovery. A live queue row or future date is not a prerequisite.
        const attempted = { ...saved, uncertain: true, confirmed: false };
        save(attempted);
        state.saved = attempted;
        list();
        if (!current(p, rev) || checked().saved.body_json !== saved.body_json)
          return;
        state.sendBusy = true;
        state.error = "";
        state.receipt = null;
        state.receiptUnsaved = false;
        const raw = await response(
          "/shop/claims/admin/hold_review",
          p,
          saved.body_json,
        );
        if (!current(p, rev)) return;
        const receipt = holdReceipt(raw, request),
          stored = checked().saved;
        if (
          stored.actor !== saved.actor ||
          stored.body_json !== saved.body_json
        )
          throw Error("storage");
        state.receipt = receipt;
        const updated: HoldSaved = {
          ...stored,
          confirmed: true,
          receipts: [
            ...stored.receipts.filter((r) => !same(r, receipt)),
            receipt,
          ],
        };
        try {
          save(updated);
          state.saved = updated;
          list();
        } catch {
          state.receiptUnsaved = true;
          state.error = "receiptStorage";
        }
      } catch {
        if (alive && (!p || current(p, rev))) state.error = "unconfirmed";
      } finally {
        if (alive) state.sendBusy = false;
      }
    },
    dispose() {
      if (!alive) return;
      clear();
      alive = false;
      unlisten();
    },
  };
}
