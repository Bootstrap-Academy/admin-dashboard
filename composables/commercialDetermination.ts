import { reactive } from "vue";
import {
  staffUuid,
  type CommercialStaffContext,
  type StaffProof,
} from "./commercialStaffContext";
import type { CaseSelection, StaffTransport } from "./commercialStaff";
import { holdNativeTime, type HoldStorage } from "./commercialHoldReview";

const fail = (): never => {
  throw Error("schema");
};
const text = (v: unknown): string => {
  if (typeof v !== "string") return fail();
  for (const c of v) {
    const n = c.codePointAt(0)!;
    if (n === 0 || (n >= 0xd800 && n <= 0xdfff)) return fail();
  }
  return v;
};
const uuid = (v: unknown) => (staffUuid(v) ? v : fail());
const object = (v: unknown, keys: string[]) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail();
  const r = v as Record<string, unknown>;
  if (
    Object.keys(r).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(r, k))
  )
    return fail();
  return r;
};
const nullable = <T>(v: unknown, parse: (v: unknown) => T): T | null =>
  v === null ? null : parse(v);
export function determinationInteger(v: unknown, signed = false): string {
  const s = text(v);
  if (
    !(signed ? /^(0|-?[1-9]\d*)$/ : /^(0|[1-9]\d*)$/).test(s) ||
    s.length > 20
  )
    return fail();
  const n = BigInt(s);
  if (n > 9223372036854775807n || n < (signed ? -9223372036854775808n : 0n))
    return fail();
  return s;
}
// Scan tokens before JSON.parse can discard duplicate decoded keys or round a number.
// Quoted original/determination JSON stays a string and is never recursively decoded.
export function determinationJson(raw: string, numberFree = true): unknown {
  let at = 0;
  const space = () => {
    while (/[\x20\t\r\n]/.test(raw[at] || "x")) at++;
  };
  const string = () => {
    const start = at++;
    while (at < raw.length) {
      const c = raw[at++];
      if (c === '"') return text(JSON.parse(raw.slice(start, at)));
      if (c === "\\") at++;
    }
    return fail();
  };
  const value = (depth: number): void => {
    if (depth > 128) return fail();
    space();
    const c = raw[at];
    if (c === '"') {
      string();
      return;
    }
    if (c === "{" || c === "[") {
      const end = c === "{" ? "}" : "]",
        keys = new Set<string>();
      at++;
      space();
      if (raw[at] === end) {
        at++;
        return;
      }
      while (at < raw.length) {
        if (c === "{") {
          space();
          if (raw[at] !== '"') return fail();
          const key = string();
          if (keys.has(key)) return fail();
          keys.add(key);
          space();
          if (raw[at++] !== ":") return fail();
        }
        value(depth + 1);
        space();
        if (raw[at] === end) {
          at++;
          return;
        }
        if (raw[at++] !== ",") return fail();
      }
      return fail();
    }
    for (const literal of ["true", "false", "null"])
      if (raw.startsWith(literal, at)) {
        at += literal.length;
        return;
      }
    if (!numberFree) {
      const n = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(
        raw.slice(at),
      );
      if (n) {
        at += n[0].length;
        return;
      }
    }
    return fail();
  };
  value(0);
  space();
  if (at !== raw.length) return fail();
  return JSON.parse(raw) as unknown;
}
const states = [
  "pending_evidence",
  "established",
  "historical_wallet_application",
  "rejected",
] as const;
const status = (v: unknown) =>
  states.includes(v as (typeof states)[number])
    ? (v as (typeof states)[number])
    : fail();
export function determinationAssessment(v: unknown): string {
  const s = text(v);
  // PostgreSQL trim(text) removes U+0020; length counts Unicode characters.
  if ([...s.replace(/^ +| +$/g, "")].length < 20) return fail();
  return s;
}
function expected(v: unknown) {
  const r = object(v, ["status", "units", "cash_units", "determination_json"]);
  if (r.status !== "pending_evidence") return fail();
  return {
    status: "pending_evidence" as const,
    units: nullable(r.units, determinationInteger),
    cash_units: nullable(r.cash_units, determinationInteger),
    determination_json: nullable(r.determination_json, text),
  };
}
function evidence(v: unknown) {
  if (!v || typeof v !== "object") return fail();
  const hasCash = Object.hasOwn(v, "cash_basis"),
    r = object(
      v,
      hasCash
        ? ["summary", "references", "cash_basis"]
        : ["summary", "references"],
    );
  if (!Array.isArray(r.references)) return fail();
  const result: {
    summary: string;
    references: { kind: string; reference: string }[];
    cash_basis?: string;
  } = {
    summary: text(r.summary),
    references: r.references.map((v) => {
      const x = object(v, ["kind", "reference"]);
      return { kind: text(x.kind), reference: text(x.reference) };
    }),
  };
  if (hasCash) result.cash_basis = text(r.cash_basis);
  return result;
}
export function determinationRequest(raw: string) {
  const r = object(determinationJson(raw), [
    "command_id",
    "case_id",
    "obligation_id",
    "units",
    "cash_units",
    "assessment",
    "evidence",
    "subject",
    "expected_obligation",
  ]);
  const result = {
    command_id: uuid(r.command_id),
    case_id: uuid(r.case_id),
    obligation_id: uuid(r.obligation_id),
    units: determinationInteger(r.units),
    cash_units: nullable(r.cash_units, determinationInteger),
    assessment: determinationAssessment(r.assessment),
    evidence: evidence(r.evidence),
    subject: uuid(r.subject),
    expected_obligation: expected(r.expected_obligation),
  };
  if (
    result.cash_units !== null &&
    (BigInt(result.cash_units) > BigInt(result.units) ||
      [...(result.evidence.cash_basis || "")].length < 20)
  )
    return fail();
  if (
    result.expected_obligation.units !== null &&
    result.units !== result.expected_obligation.units
  )
    return fail();
  return result;
}
export type DeterminationRequest = ReturnType<typeof determinationRequest>;
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, n) => same(v, b[n]));
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const x = a as Record<string, unknown>,
      y = b as Record<string, unknown>;
    return (
      Object.keys(x).length === Object.keys(y).length &&
      Object.keys(x).every((k) => Object.hasOwn(y, k) && same(x[k], y[k]))
    );
  }
  return false;
};
export const determinationSameBody = (a: string, b: string) =>
  same(determinationRequest(a), determinationRequest(b));
export function determinationReceipt(v: unknown, obligation: string) {
  const r = object(v, ["obligation_id", "status", "paid"]);
  if (
    uuid(r.obligation_id) !== obligation ||
    r.status !== "established" ||
    r.paid !== false
  )
    return fail();
  return {
    obligation_id: obligation,
    status: "established" as const,
    paid: false as const,
  };
}
export type DeterminationTarget = {
  case_id: string;
  subject: string;
  obligation_id: string;
  command_id: string | null;
};
export function determinationStatus(v: unknown, target: DeterminationTarget) {
  const r = object(v, [
      "protocol",
      "case_id",
      "subject",
      "observed_at",
      "obligation",
      "journal",
    ]),
    o = object(r.obligation, [
      "id",
      "source",
      "source_key",
      "component",
      "status",
      "units",
      "cash_units",
      "original_json",
      "determination_json",
    ]);
  if (
    r.protocol !== 1 ||
    uuid(r.case_id) !== target.case_id ||
    uuid(r.subject) !== target.subject ||
    uuid(o.id) !== target.obligation_id
  )
    return fail();
  const obligation = {
    id: uuid(o.id),
    source: text(o.source),
    source_key: text(o.source_key),
    component: text(o.component),
    status: status(o.status),
    units: nullable(o.units, determinationInteger),
    cash_units: nullable(o.cash_units, determinationInteger),
    original_json: text(o.original_json),
    determination_json: nullable(o.determination_json, text),
  };
  let journal = null;
  if (r.journal !== null) {
    const j = object(r.journal, [
      "id",
      "case_id",
      "obligation_id",
      "actor",
      "command_id",
      "kind",
      "request_json",
      "result_json",
      "recorded_at",
    ]);
    if (
      uuid(j.case_id) !== target.case_id ||
      uuid(j.obligation_id) !== target.obligation_id ||
      uuid(j.command_id) !== target.command_id ||
      j.kind !== "determine"
    )
      return fail();
    journal = {
      id: determinationInteger(j.id, true),
      case_id: uuid(j.case_id),
      obligation_id: uuid(j.obligation_id),
      actor: uuid(j.actor),
      command_id: uuid(j.command_id),
      kind: "determine" as const,
      request_json: text(j.request_json),
      result_json: text(j.result_json),
      recorded_at: holdNativeTime(j.recorded_at),
    };
  }
  return {
    protocol: 1 as const,
    case_id: target.case_id,
    subject: target.subject,
    observed_at: holdNativeTime(r.observed_at, true),
    obligation,
    journal,
  };
}
type Status = ReturnType<typeof determinationStatus>;
type Receipt = ReturnType<typeof determinationReceipt>;
export type DeterminationSaved = {
  schema_version: 1;
  actor: string;
  case_id: string;
  subject: string;
  obligation_id: string;
  command_id: string;
  body_json: string;
  preparation: { observed_at: string };
  uncertain: boolean;
  receipts: Receipt[];
  claimed_receipts: Receipt[];
};
export function determinationSaved(v: unknown): DeterminationSaved {
  const r = object(v, [
      "schema_version",
      "actor",
      "case_id",
      "subject",
      "obligation_id",
      "command_id",
      "body_json",
      "preparation",
      "uncertain",
      "receipts",
      "claimed_receipts",
    ]),
    body = text(r.body_json),
    request = determinationRequest(body),
    p = object(r.preparation, ["observed_at"]);
  if (
    r.schema_version !== 1 ||
    typeof r.uncertain !== "boolean" ||
    !Array.isArray(r.receipts) ||
    !Array.isArray(r.claimed_receipts)
  )
    return fail();
  for (const key of [
    "case_id",
    "subject",
    "obligation_id",
    "command_id",
  ] as const)
    if (uuid(r[key]) !== request[key]) return fail();
  const receipts = r.receipts.map((v) =>
    determinationReceipt(v, request.obligation_id),
  );
  if (receipts.length && !r.uncertain) return fail();
  return {
    schema_version: 1,
    actor: uuid(r.actor),
    case_id: request.case_id,
    subject: request.subject,
    obligation_id: request.obligation_id,
    command_id: request.command_id,
    body_json: body,
    preparation: { observed_at: holdNativeTime(p.observed_at, true) },
    uncertain: r.uncertain,
    receipts,
    claimed_receipts: r.claimed_receipts.map((v) =>
      determinationReceipt(v, request.obligation_id),
    ),
  };
}
const prefix = "bootstrap.staff-determination.v1.",
  key = (id: string) => prefix + uuid(id);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const unique = (rs: Receipt[]) =>
  rs.filter((r, n) => !rs.slice(0, n).some((v) => same(v, r)));
type ImportTicket = Readonly<{ ordinal: number }>;
export function createCommercialDetermination(
  context: CommercialStaffContext,
  transport: StaffTransport,
  storage: () => HoldStorage,
  newId: () => string = () => crypto.randomUUID(),
) {
  let alive = true,
    liveRevision = 0,
    savedRevision = 0,
    importOrdinal = 0,
    activeImport: ImportTicket | null = null;
  const state = reactive({
    target: null as CaseSelection | null,
    obligation: "",
    live: null as Status | null,
    recovery: null as Status | null,
    units: "",
    cash: "",
    cashKnown: false,
    assessment: "",
    summary: "",
    referenceKind: "",
    reference: "",
    cashBasis: "",
    confirm: false,
    liveBusy: false,
    recoveryBusy: false,
    sendBusy: false,
    error: "",
    authority: false,
    records: [] as DeterminationSaved[],
    unsupported: [] as { key: string; raw: string }[],
    saved: null as DeterminationSaved | null,
    receipt: null as Receipt | null,
    receiptUnsaved: false,
    importRaw: "",
  });
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
  const importCurrent = (ticket: ImportTicket | null) =>
    alive && !state.sendBusy && ticket !== null && activeImport === ticket;
  const finishImport = (ticket: ImportTicket | null) => {
    if (!importCurrent(ticket)) return false;
    invalidateImports();
    return true;
  };
  const clearForm = () => {
    state.units =
      state.cash =
      state.assessment =
      state.summary =
      state.referenceKind =
      state.reference =
      state.cashBasis =
        "";
    state.cashKnown = state.confirm = false;
  };
  const clear = () => {
    invalidateImports();
    liveRevision++;
    savedRevision++;
    state.live = state.recovery = null;
    state.liveBusy = state.recoveryBusy = false;
    state.authority = false;
    state.receipt = null;
    state.receiptUnsaved = false;
    state.error = "authority";
    clearForm();
  };
  const unlisten = context.onInvalidate(clear);
  const proof = () => {
    if (!context.activate()) {
      clear();
      return null;
    }
    const p = context.capture();
    if (p) state.authority = true;
    return p;
  };
  const current = (p: StaffProof, rev: number, saved: boolean) =>
    alive &&
    context.current(p) &&
    rev === (saved ? savedRevision : liveRevision);
  const readRecord = (id: string) => {
    const raw = storage().getItem(key(id));
    if (raw === null) return null;
    const r = determinationSaved(determinationJson(raw, false));
    if (r.command_id !== id) return fail();
    return r;
  };
  const save = (r: DeterminationSaved, guard: () => boolean = () => alive) => {
    const old = readRecord(r.command_id);
    if (
      old &&
      (old.actor !== r.actor ||
        old.body_json !== r.body_json ||
        !same(old.preparation, r.preparation) ||
        (old.uncertain && !r.uncertain) ||
        old.receipts.some((x) => !r.receipts.some((y) => same(x, y))) ||
        old.claimed_receipts.some(
          (x) => !r.claimed_receipts.some((y) => same(x, y)),
        ))
    )
      return fail();
    if (!guard()) throw Error("stale");
    const raw = JSON.stringify(r);
    storage().setItem(key(r.command_id), raw);
    if (storage().getItem(key(r.command_id)) !== raw) throw Error("storage");
  };
  const list = () => {
    const records: DeterminationSaved[] = [],
      unsupported: { key: string; raw: string }[] = [],
      s = storage();
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (!k?.startsWith(prefix)) continue;
      const raw = s.getItem(k);
      if (raw === null) continue;
      try {
        const r = readRecord(k.slice(prefix.length));
        if (r) records.push(r);
      } catch {
        unsupported.push({ key: k, raw });
      }
    }
    state.records = records;
    state.unsupported = unsupported;
    return records;
  };
  const selected = (r: DeterminationSaved | null, importing = false) => {
    if (!importing) invalidateImports();
    savedRevision++;
    state.saved = r;
    state.recovery = null;
    state.recoveryBusy = false;
    state.receipt = null;
    state.receiptUnsaved = false;
    state.error = "";
    state.importRaw = "";
  };
  const checked = () => {
    if (!state.saved) return fail();
    const r = determinationSaved(clone(state.saved)),
      stored = readRecord(r.command_id);
    if (!stored || !same(stored, r)) throw Error("storage");
    return stored;
  };
  const targetFor = (r: DeterminationSaved): DeterminationTarget => ({
    case_id: r.case_id,
    subject: r.subject,
    obligation_id: r.obligation_id,
    command_id: r.command_id,
  });
  async function request(
    path:
      | "/shop/claims/admin/determination_status"
      | "/shop/claims/admin/determine",
    p: StaffProof,
    body: string,
  ) {
    const r = await transport(path, p, body);
    context.reject(p, r.status);
    if (r.status !== 200)
      throw Error(r.status === 404 ? "missing" : "unconfirmed");
    if (r.mime.split(";")[0].trim() !== "application/json") return fail();
    return r.text;
  }
  const recordReceipt = (
    saved: DeterminationSaved,
    receipt: Receipt,
    guard: () => boolean,
  ) => {
    if (!guard()) return;
    state.receipt = receipt;
    state.receiptUnsaved = false;
    try {
      const stored = checked();
      if (stored.actor !== saved.actor || stored.body_json !== saved.body_json)
        throw Error("storage");
      const updated = {
        ...stored,
        uncertain: true,
        receipts: unique([...stored.receipts, receipt]),
      };
      save(updated, guard);
      if (!guard()) return;
      state.saved = updated;
      list();
    } catch {
      if (guard()) {
        state.receiptUnsaved = true;
        state.error = "receiptStorage";
      }
    }
  };
  return {
    state,
    beginImport,
    finishImport,
    importError(ticket: ImportTicket | null) {
      if (importCurrent(ticket)) state.error = "import";
    },
    setTarget(value: CaseSelection | null) {
      if (!alive) return;
      invalidateImports();
      liveRevision++;
      state.target = value
        ? { id: uuid(value.id), subject: uuid(value.subject) }
        : null;
      state.obligation = "";
      state.live = null;
      state.liveBusy = false;
      clearForm();
    },
    editObligation(value: string) {
      if (!alive) return;
      invalidateImports();
      liveRevision++;
      state.obligation = value;
      state.live = null;
      state.liveBusy = false;
      clearForm();
    },
    edit(
      field:
        | "units"
        | "cash"
        | "cashKnown"
        | "assessment"
        | "summary"
        | "referenceKind"
        | "reference"
        | "cashBasis"
        | "confirm",
      value: string | boolean,
    ) {
      if (!alive) return;
      liveRevision++;
      state.liveBusy = false;
      if (field === "cashKnown" || field === "confirm")
        state[field] = Boolean(value);
      else state[field] = String(value);
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
    selectSaved(id: string) {
      if (!alive) return;
      invalidateImports();
      try {
        selected(readRecord(id));
      } catch {
        state.error = "storage";
      }
    },
    async loadStatus(recovery = false) {
      if (!alive) return;
      let p: StaffProof | null = null,
        rev = 0;
      try {
        const saved = recovery ? checked() : null;
        if (!recovery && (!state.target || !staffUuid(state.obligation)))
          throw Error("target");
        let target: DeterminationTarget;
        if (saved) target = targetFor(saved);
        else
          target = {
            case_id: state.target!.id,
            subject: state.target!.subject,
            obligation_id: uuid(state.obligation),
            command_id: null,
          };
        p = proof();
        if (!p) return;
        rev = recovery ? ++savedRevision : ++liveRevision;
        if (recovery) {
          state.recovery = null;
          state.recoveryBusy = true;
        } else {
          state.live = null;
          state.liveBusy = true;
          clearForm();
        }
        state.error = "";
        const raw = await request(
          "/shop/claims/admin/determination_status",
          p,
          JSON.stringify(target),
        );
        if (!current(p, rev, recovery)) return;
        const result = determinationStatus(
          determinationJson(raw, false),
          target,
        );
        if (saved) {
          state.recovery = result;
          const j = result.journal;
          if (j && j.actor === saved.actor) {
            try {
              if (!determinationSameBody(saved.body_json, j.request_json))
                throw Error("history");
              const receipt = determinationReceipt(
                determinationJson(j.result_json),
                saved.obligation_id,
              );
              recordReceipt(saved, receipt, () => current(p!, rev, true));
            } catch {
              state.error = "history";
            }
          } else if (j) state.error = "history";
        } else {
          state.live = result;
          state.units = result.obligation.units || "";
        }
      } catch (e) {
        if (alive && (!p || current(p, rev, recovery)))
          state.error =
            e instanceof Error && e.message === "missing"
              ? "missing"
              : "unavailable";
      } finally {
        if (alive && rev === (recovery ? savedRevision : liveRevision)) {
          if (recovery) state.recoveryBusy = false;
          else state.liveBusy = false;
        }
      }
    },
    prepare() {
      if (!alive || state.sendBusy) return;
      invalidateImports();
      try {
        const p = proof(),
          rev = liveRevision,
          live = state.live && clone(state.live);
        if (
          !p ||
          !live ||
          !state.target ||
          live.case_id !== state.target.id ||
          live.subject !== state.target.subject ||
          live.obligation.id !== state.obligation ||
          live.obligation.status !== "pending_evidence" ||
          !state.confirm
        )
          return fail();
        const ev = {
          summary: state.summary,
          references:
            state.referenceKind || state.reference
              ? [{ kind: state.referenceKind, reference: state.reference }]
              : [],
          ...(state.cashKnown ? { cash_basis: state.cashBasis } : {}),
        };
        const candidate = {
          command_id: "00000000-0000-0000-0000-000000000000",
          case_id: live.case_id,
          subject: live.subject,
          obligation_id: live.obligation.id,
          units: state.units,
          cash_units: state.cashKnown ? state.cash : null,
          assessment: state.assessment,
          evidence: ev,
          expected_obligation: {
            status: live.obligation.status,
            units: live.obligation.units,
            cash_units: live.obligation.cash_units,
            determination_json: live.obligation.determination_json,
          },
        };
        determinationRequest(JSON.stringify(candidate));
        if (
          list().some(
            (r) =>
              r.case_id === live.case_id &&
              r.obligation_id === live.obligation.id &&
              r.receipts.length === 0,
          )
        )
          throw Error("pending");
        if (!current(p, rev, false)) return;
        candidate.command_id = uuid(newId());
        if (storage().getItem(key(candidate.command_id)) !== null)
          throw Error("storage");
        const body = JSON.stringify(candidate),
          r: DeterminationSaved = {
            schema_version: 1,
            actor: p.uid,
            case_id: live.case_id,
            subject: live.subject,
            obligation_id: live.obligation.id,
            command_id: candidate.command_id,
            body_json: body,
            preparation: { observed_at: live.observed_at },
            uncertain: false,
            receipts: [],
            claimed_receipts: [],
          };
        save(r, () => current(p, rev, false));
        if (!current(p, rev, false)) return;
        selected(r);
        list();
      } catch (e) {
        state.error =
          e instanceof Error && e.message === "pending" ? "pending" : "prepare";
      }
    },
    importFile(raw: string, ticket?: ImportTicket | null) {
      const own = ticket === undefined,
        t = own ? beginImport() : ticket;
      if (!importCurrent(t)) return;
      try {
        const r = determinationSaved(determinationJson(raw, false)),
          old = readRecord(r.command_id);
        if (
          old &&
          (old.actor !== r.actor ||
            old.body_json !== r.body_json ||
            !same(old.preparation, r.preparation))
        )
          return fail();
        r.uncertain = true;
        r.claimed_receipts = unique([
          ...(old?.claimed_receipts || []),
          ...r.claimed_receipts,
          ...r.receipts,
        ]);
        r.receipts = old?.receipts || [];
        save(r, () => importCurrent(t));
        if (!importCurrent(t)) return;
        selected(r, true);
        list();
      } catch {
        if (importCurrent(t)) {
          state.error = "import";
          state.importRaw = raw;
        }
      } finally {
        if (own) finishImport(t);
      }
    },
    exportFile() {
      try {
        return JSON.stringify(checked(), null, 2);
      } catch {
        state.error = "storage";
        return null;
      }
    },
    async send() {
      if (!alive || state.sendBusy) return;
      invalidateImports();
      let p: StaffProof | null = null,
        rev = savedRevision;
      try {
        const saved = checked();
        p = proof();
        rev = ++savedRevision;
        state.recoveryBusy = false;
        state.recovery = null;
        if (!p) return;
        if (p.uid !== saved.actor) {
          state.error = "actor";
          return;
        }
        const attempted = { ...saved, uncertain: true };
        save(attempted, () => current(p!, rev, true));
        if (!current(p, rev, true)) return;
        state.saved = attempted;
        list();
        if (!current(p, rev, true) || checked().body_json !== saved.body_json)
          return;
        state.sendBusy = true;
        state.error = "";
        state.receipt = null;
        state.receiptUnsaved = false;
        const raw = await request(
          "/shop/claims/admin/determine",
          p,
          saved.body_json,
        );
        if (!current(p, rev, true)) return;
        recordReceipt(
          saved,
          determinationReceipt(determinationJson(raw), saved.obligation_id),
          () => current(p!, rev, true),
        );
      } catch {
        if (alive && (!p || current(p, rev, true))) state.error = "unconfirmed";
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
