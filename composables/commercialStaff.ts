import { reactive } from "vue";
import {
  staffUuid,
  type CommercialStaffContext,
  type StaffProof,
} from "./commercialStaffContext";

type ObjectValue = Record<string, unknown>;
const object = (v: unknown): ObjectValue => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("schema");
  return v as ObjectValue;
};
const str = (v: unknown): string => {
  if (typeof v !== "string") throw Error("schema");
  return v;
};
const uuid = (v: unknown): string => {
  if (!staffUuid(v)) throw Error("schema");
  return v;
};
const nullable = <T>(v: unknown, parse: (value: unknown) => T): T | null =>
  v === null ? null : parse(v);
const decimal = (v: unknown, signed = false): string => {
  const text = str(v);
  if (!(signed ? /^(0|-?[1-9]\d*)$/ : /^(0|[1-9]\d*)$/).test(text))
    throw Error("schema");
  return text;
};
const timestamp = (v: unknown): string => {
  const text = str(v);
  if (
    !/^(?:-?infinity|\d{4,7}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d(?::?\d\d)?)(?: BC)?)$/.test(
      text,
    )
  )
    throw Error("schema");
  return text;
};
const choice = <T extends string>(v: unknown, choices: readonly T[]): T => {
  if (!choices.includes(v as T)) throw Error("schema");
  return v as T;
};
const rows = <T extends { id: string }>(
  v: unknown,
  parse: (value: unknown) => T,
): T[] => {
  if (!Array.isArray(v)) throw Error("schema");
  const result = v.map(parse);
  if (new Set(result.map((row) => row.id)).size !== result.length)
    throw Error("schema");
  return result;
};
export type StaffCase = {
  id: string;
  subject: string;
  erased_at: string | null;
  inventory: ObjectValue;
  assigned_to: string | null;
  review_reason: string;
  closed_at: string | null;
  due_at: string;
};
export function staffQueue(v: unknown): StaffCase[] {
  const result = rows(v, (value) => {
    const r = object(value);
    return {
      id: uuid(r.id),
      subject: uuid(r.subject),
      erased_at: nullable(r.erased_at, timestamp),
      inventory: object(r.inventory),
      assigned_to: nullable(r.assigned_to, uuid),
      review_reason: str(r.review_reason),
      closed_at: nullable(r.closed_at, timestamp),
      due_at: timestamp(r.due_at),
    };
  });
  if (
    result.length > 100 ||
    new Set(result.map((row) => row.subject)).size !== result.length
  )
    throw Error("schema");
  return result;
}
export type CaseSelection = { id: string; subject: string };
export function staffDetail(raw: string, selected: CaseSelection) {
  const data = object(JSON.parse(raw)),
    value = object(data.case);
  if (
    uuid(value.id) !== selected.id ||
    uuid(value.subject) !== selected.subject
  )
    throw Error("schema");
  return {
    raw,
    id: selected.id,
    subject: selected.subject,
    review_reason: str(value.review_reason),
    erased_at: nullable(value.erased_at, timestamp),
    closed_at: nullable(value.closed_at, timestamp),
    assigned_to: nullable(value.assigned_to, uuid),
    review_due_at: timestamp(value.review_due_at),
  };
}
export function staffCapacity(v: unknown, selected: CaseSelection) {
  const r = object(v);
  if (
    r.protocol !== 1 ||
    r.currency !== "EUR" ||
    r.units_per_eur !== 100 ||
    r.coin_policy !== "fungible_reward_first" ||
    uuid(r.case_id) !== selected.id ||
    uuid(r.subject) !== selected.subject
  )
    throw Error("schema");
  const basis = object(r.captured_basis),
    status = choice(r.historic_prior_refund_status, [
      "unknown",
      "operator_reviewed",
    ] as const);
  const prior = nullable(r.historic_prior_refund_units, decimal);
  const review =
    r.historic_prior_refund_review === null
      ? null
      : object(r.historic_prior_refund_review);
  if (
    status === "unknown"
      ? prior !== null || review !== null
      : prior === null || review === null
  )
    throw Error("schema");
  if (review) {
    if (
      uuid(review.case_id) !== selected.id ||
      decimal(review.prior_refund_units) !== prior ||
      !Object.hasOwn(review, "assessment")
    )
      throw Error("schema");
    timestamp(review.reviewed_at);
  }
  const obligations = rows(r.obligations, (value) => {
    const o = object(value);
    return {
      id: uuid(o.id),
      source: str(o.source),
      source_key: str(o.source_key),
      component: str(o.component),
      status: choice(o.status, [
        "pending_evidence",
        "established",
        "historical_wallet_application",
        "rejected",
      ] as const),
      units: nullable(o.units, decimal),
      cash_units: nullable(o.cash_units, decimal),
      remaining_units: nullable(o.remaining_units, decimal),
      remaining_cash_units: nullable(o.remaining_cash_units, decimal),
      counted_reservation_units: decimal(o.counted_reservation_units),
      counted_cash_reservation_units: decimal(o.counted_cash_reservation_units),
    };
  });
  const reservations = rows(r.reservations, (value) => {
    const x = object(value),
      obligation = uuid(x.obligation_id);
    if (!obligations.some((o) => o.id === obligation)) throw Error("schema");
    return {
      id: uuid(x.id),
      obligation_id: obligation,
      parent_id: nullable(x.parent_id, uuid),
      mode: choice(x.mode, ["cash", "wallet", "redemption"] as const),
      state: choice(x.state, [
        "reserved",
        "uncertain",
        "completed",
        "failed",
        "split",
      ] as const),
      units: decimal(x.units),
      purchase_capacity_units: nullable(x.purchase_capacity_units, decimal),
    };
  });
  const result = {
    case_id: selected.id,
    subject: selected.subject,
    observed_at: timestamp(r.observed_at),
    captured_purchase_units: nullable(r.captured_purchase_units, (value) =>
      decimal(value, true),
    ),
    captured_basis: {
      kind: choice(basis.kind, [
        "live_original_claimant_capture_records",
        "preserved_original_claimant_erasure_observation",
      ] as const),
      live_captured_record_count: nullable(
        basis.live_captured_record_count,
        decimal,
      ),
      evidence_id: nullable(basis.evidence_id, uuid),
      recorded_at: nullable(basis.recorded_at, timestamp),
    },
    historic_prior_refund_status: status,
    historic_prior_refund_units: prior,
    historic_prior_refund_review: review
      ? { reviewed_at: timestamp(review.reviewed_at) }
      : null,
    known_reserved_purchase_capacity_units: decimal(
      r.known_reserved_purchase_capacity_units,
    ),
    known_uncertain_purchase_capacity_units: decimal(
      r.known_uncertain_purchase_capacity_units,
    ),
    known_recorded_completed_purchase_capacity_units: decimal(
      r.known_recorded_completed_purchase_capacity_units,
    ),
    unknown_reservation_capacity_count: decimal(
      r.unknown_reservation_capacity_count,
    ),
    remaining_purchase_capacity: nullable(
      r.remaining_purchase_capacity,
      decimal,
    ),
    obligations,
    reservations,
  };
  const b = result.captured_basis;
  if (
    b.kind === "live_original_claimant_capture_records"
      ? b.live_captured_record_count === null ||
        b.evidence_id !== null ||
        b.recorded_at !== null
      : b.live_captured_record_count !== null ||
        (b.evidence_id === null) !== (b.recorded_at === null)
  )
    throw Error("schema");
  if (
    (prior === null ||
      result.captured_purchase_units === null ||
      BigInt(result.unknown_reservation_capacity_count) > 0n) &&
    result.remaining_purchase_capacity !== null
  )
    throw Error("schema");
  return result;
}
export function staffMoney(units: string): string {
  decimal(units, true);
  const negative = units.startsWith("-"),
    digits = (negative ? units.slice(1) : units).padStart(3, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)} EUR`;
}
export const staffPurchaseVariants = [
  "terms",
  "withdrawal",
  "confirmation",
  "timing",
  "timing-original",
  "fulfillment",
  "fulfillment-original",
] as const;
export type StaffDocumentSelector = {
  kind: string;
  id: string;
  variant: string;
};
export function staffDocument(
  caseId: string,
  selection: StaffDocumentSelector,
) {
  uuid(caseId);
  const { kind, id, variant } = selection;
  if (kind === "purchase") {
    uuid(id);
    choice(variant, staffPurchaseVariants);
  } else {
    decimal(id);
    const n = BigInt(id);
    if (kind === "invoice") {
      if (variant !== "original" || n > 9223372036854775807n)
        throw Error("schema");
    } else if (kind === "final-statement") {
      if (variant !== "original" || n > 18446744073709551615n)
        throw Error("schema");
    } else if (kind === "credit-note") {
      // Chrono NaiveDate::MAX is 262142-12-31; the API first receives u64.
      if (n > 262142n || !/^(?:[1-9]|1[0-2])$/.test(variant))
        throw Error("schema");
    } else throw Error("schema");
  }
  const mime =
    kind === "purchase" && variant !== "terms" && variant !== "withdrawal"
      ? "text/plain"
      : "application/pdf";
  return Object.freeze({
    kind,
    id,
    variant,
    mime,
    path: `/shop/claims/admin/cases/${caseId}/documents/${kind}/${id}/${variant}`,
    filename: `${caseId}-${kind}-${id}-${variant}.${mime === "application/pdf" ? "pdf" : "txt"}`,
  });
}
export type StaffTransport = (
  path: string,
  proof: StaffProof,
  body?: ObjectValue | string,
) => Promise<{ status: number; text: string; bytes: Uint8Array; mime: string }>;
export function staffTransport(
  base: string,
  fetcher: typeof fetch = fetch,
): StaffTransport {
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error("api");
  const prefix = url.href.replace(/\/$/, "");
  return async (path, proof, body) => {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetcher(prefix + path, {
        method: body ? "POST" : "GET",
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${proof.bearer}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body
          ? typeof body === "string"
            ? body
            : JSON.stringify(body)
          : undefined,
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        // The captured-proof rejection must not wait for an unreadable body.
        controller.abort();
        return {
          status: response.status,
          bytes: new Uint8Array(),
          text: "",
          mime: "",
        };
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        bytes,
        text: new TextDecoder().decode(bytes),
        mime: (response.headers.get("content-type") || "").toLowerCase(),
      };
    } finally {
      clearTimeout(timer);
    }
  };
}
export function createCommercialStaff(
  context: CommercialStaffContext,
  transport: StaffTransport,
  download: (bytes: Uint8Array, mime: string, filename: string) => void,
) {
  let alive = true,
    queueRevision = 0,
    caseRevision = 0,
    capacityRevision = 0,
    documentRevision = 0;
  const state = reactive({
    queue: [] as StaffCase[],
    offset: 0,
    selected: null as CaseSelection | null,
    detail: null as ReturnType<typeof staffDetail> | null,
    capacity: null as ReturnType<typeof staffCapacity> | null,
    queueBusy: false,
    detailBusy: false,
    capacityBusy: false,
    documentBusy: false,
    queueError: "",
    detailError: "",
    capacityError: "",
    documentError: "",
    authority: false,
    downloaded: false,
  });
  const clear = () => {
    queueRevision++;
    caseRevision++;
    capacityRevision++;
    documentRevision++;
    state.queue = [];
    state.selected = null;
    state.detail = null;
    state.capacity = null;
    state.authority = false;
    state.downloaded = false;
    state.queueBusy =
      state.detailBusy =
      state.capacityBusy =
      state.documentBusy =
        false;
    state.queueError = "authority";
    state.detailError = state.capacityError = state.documentError = "";
  };
  const unlisten = context.onInvalidate(clear);
  async function read(path: string, proof: StaffProof, body?: ObjectValue) {
    const response = await transport(path, proof, body);
    context.reject(proof, response.status); // Authority rejection precedes selected-content guards.
    if (response.status !== 200)
      throw Object.assign(Error("request"), { status: response.status });
    if (body && response.mime.split(";")[0].trim() !== "application/json")
      throw Error("schema");
    return response;
  }
  const error = (e: unknown) => {
    const status = (e as { status?: number })?.status;
    return status === 404
      ? "missing"
      : status === 400 || (e instanceof Error && e.message === "schema")
        ? "malformed"
        : "unavailable";
  };
  function select(value: CaseSelection | null) {
    caseRevision++;
    capacityRevision++;
    documentRevision++;
    state.selected = value
      ? { id: uuid(value.id), subject: uuid(value.subject) }
      : null;
    state.detail = null;
    state.capacity = null;
    state.downloaded = false;
    state.detailBusy = state.capacityBusy = state.documentBusy = false;
    state.detailError = state.capacityError = state.documentError = "";
  }
  return {
    state,
    select,
    async queue(offset = 0) {
      if (
        !alive ||
        !Number.isInteger(offset) ||
        offset < 0 ||
        offset > 2147483647
      )
        return;
      if (!context.activate()) {
        clear();
        return;
      }
      const proof = context.capture();
      if (!proof) return;
      const version = ++queueRevision;
      state.authority = true;
      state.queueBusy = true;
      state.queueError = "";
      state.queue = [];
      state.offset = offset;
      try {
        const result = await read("/shop/claims/admin/queue", proof, {
          offset,
        });
        if (alive && context.current(proof) && version === queueRevision)
          state.queue = staffQueue(JSON.parse(result.text));
      } catch (e) {
        if (alive && context.current(proof) && version === queueRevision)
          state.queueError = error(e);
      } finally {
        if (alive && version === queueRevision) state.queueBusy = false;
      }
    },
    async detail() {
      const selected = state.selected && { ...state.selected },
        proof = context.capture();
      if (!selected || !proof || !alive) return;
      const version = ++caseRevision;
      state.detail = null;
      state.detailBusy = true;
      state.detailError = "";
      try {
        const result = await read("/shop/claims/admin/detail", proof, {
          subject: selected.subject,
        });
        if (alive && context.current(proof) && version === caseRevision)
          state.detail = staffDetail(result.text, selected);
      } catch (e) {
        if (alive && context.current(proof) && version === caseRevision)
          state.detailError = error(e);
      } finally {
        if (alive && version === caseRevision) state.detailBusy = false;
      }
    },
    async capacity() {
      const selected = state.selected && { ...state.selected },
        proof = context.capture();
      if (!selected || !proof || !alive) return;
      const version = ++capacityRevision;
      state.capacity = null;
      state.capacityBusy = true;
      state.capacityError = "";
      try {
        const result = await read("/shop/claims/admin/cash_capacity", proof, {
          case_id: selected.id,
          subject: selected.subject,
        });
        if (alive && context.current(proof) && version === capacityRevision)
          state.capacity = staffCapacity(JSON.parse(result.text), selected);
      } catch (e) {
        if (alive && context.current(proof) && version === capacityRevision)
          state.capacityError = error(e);
      } finally {
        if (alive && version === capacityRevision) state.capacityBusy = false;
      }
    },
    editDocument() {
      documentRevision++;
      state.downloaded = false;
      state.documentBusy = false;
      state.documentError = "";
    },
    async document(selector: StaffDocumentSelector) {
      const selected = state.selected && { ...state.selected },
        proof = context.capture();
      if (!selected || !proof || !alive) return;
      const version = ++documentRevision;
      state.documentBusy = true;
      state.documentError = "";
      state.downloaded = false;
      try {
        const tuple = staffDocument(selected.id, { ...selector }),
          result = await read(tuple.path, proof);
        if (!alive || !context.current(proof) || version !== documentRevision)
          return;
        if (
          result.mime.split(";")[0].trim() !== tuple.mime ||
          result.bytes.length === 0
        )
          throw Error("schema");
        download(result.bytes, tuple.mime, tuple.filename);
        state.downloaded = true;
      } catch (e) {
        if (alive && context.current(proof) && version === documentRevision)
          state.documentError = error(e);
      } finally {
        if (alive && version === documentRevision) state.documentBusy = false;
      }
    },
    dispose() {
      if (!alive) return;
      clear();
      alive = false;
      unlisten();
      context.dispose();
    },
  };
}
