<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { createCommercialStaffContext } from "../../composables/commercialStaffContext";
import CommercialHoldReview from "../../components/CommercialHoldReview.vue";
import CommercialDetermination from "../../components/CommercialDetermination.vue";
import CommercialRetentionPage from "../../components/CommercialRetentionPage.vue";
import {
  createCommercialStaff,
  staffMoney,
  staffPurchaseVariants,
  staffTransport,
  type StaffCase,
  type StaffTransport,
} from "../../composables/commercialStaff";
import {
  caseLines,
  overviewDate,
  overviewTime,
  recordWork,
  waitingWork,
  type CaseState,
  type CaseWork,
} from "../../composables/commercialOverview";
import { useWaitingCounts } from "../../composables/waitingCounts";

definePageMeta({ layout: "dashboard" });
const { t, te, locale } = useI18n();
const app = useNuxtApp();
const context = createCommercialStaffContext({
  user: useUser(),
  session: useSession(),
  token: useAccessToken(),
  getToken: getAccessToken,
  run: (callback) => app.runWithContext(callback),
  browser: window,
  document,
});
// Why the guard emptied the page decides whether the lists are read again:
// a refusal by the server never is, focus or a renewed session is.
let emptied = false,
  denied = false;
context.onInvalidate(() => {
  emptied = true;
});
const send = staffTransport(String(useRuntimeConfig().public.BASE_API_URL));
const transport: StaffTransport = async (path, proof, body) => {
  const response = await send(path, proof, body);
  if (response.status === 401 || response.status === 403) denied = true;
  return response;
};
const controller = createCommercialStaff(
  context,
  transport,
  (bytes, mime, filename) => {
    const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes)], { type: mime }),
    );
    const anchor = document.createElement("a");
    try {
      anchor.href = url;
      anchor.download = filename;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      URL.revokeObjectURL(url);
    }
  },
);
const state = controller.state;
const selector = reactive({ kind: "invoice", id: "", variant: "original" });
watch(
  () => selector.kind,
  (kind) => {
    selector.id = "";
    selector.variant =
      kind === "purchase" ? "terms" : kind === "credit-note" ? "1" : "original";
  },
  { flush: "sync" },
);
watch(
  () => [selector.kind, selector.id, selector.variant],
  () => controller.editDocument(),
  { flush: "sync" },
);
const variants = computed(() =>
  selector.kind === "purchase"
    ? [...staffPurchaseVariants]
    : selector.kind === "credit-note"
      ? Array.from({ length: 12 }, (_, n) => String(n + 1))
      : ["original"],
);
const mainAmounts = [
  "captured_purchase_units",
  "historic_prior_refund_units",
  "remaining_purchase_capacity",
] as const;
const otherAmounts = [
  "known_reserved_purchase_capacity_units",
  "known_uncertain_purchase_capacity_units",
  "known_recorded_completed_purchase_capacity_units",
] as const;
const amount = (value: string | null) =>
  value === null
    ? t("Commercial.unknown")
    : staffMoney(value).replace(".", locale.value === "de" ? "," : ".");
const message = (error: string) => t(`Commercial.errors.${error}`);
const day = (value: string | null) =>
  value === null ? "" : overviewDate(overviewTime(value), locale.value);
const date = (time: number | null) => overviewDate(time, locale.value);
const short = (id: string) => id.slice(0, 8);
function itemName(row: { source: string; component: string }) {
  const key = `Commercial.components.${row.component}`;
  return /^[a-z_]+$/.test(row.component) && te(key)
    ? t(key)
    : `${row.source} · ${row.component}`;
}

// The record reviews decide what waits; see composables/commercialOverview.
type HoldPanel = {
  state: {
    queue: {
      observed_at: string;
      rows: { case_id: string; review_due_at: string }[];
      exhausted: boolean;
    } | null;
    queueBusy: boolean;
    receipt: unknown;
  };
  head: boolean;
  load: () => Promise<void>;
};
type DeterminationPanel = {
  state: { receipt: unknown };
  open: (obligation: string) => Promise<void>;
};
const hold = ref<HoldPanel | null>(null);
const determination = ref<DeterminationPanel | null>(null);
const work = shallowRef<Map<string, CaseWork> | null>(null);
const partial = ref(false);
watch(
  () => [hold.value?.state.queue ?? null, hold.value?.head ?? true] as const,
  ([queue, head]) => {
    if (!queue) {
      work.value = null;
      return;
    }
    // A later page of records says nothing about the total; keep the first.
    if (!head) return;
    const now = overviewTime(queue.observed_at) ?? Date.now(),
      last = queue.rows.at(-1);
    work.value = recordWork(queue.rows, now);
    partial.value =
      !queue.exhausted &&
      !!last &&
      (overviewTime(last.review_due_at) ?? -Infinity) <= now;
  },
);
const lines = computed(() => caseLines(state.queue, work.value ?? new Map()));
const counts = computed(() => {
  const result = { due: 0, later: 0, clear: 0, closed: 0 };
  for (const line of lines.value) result[line.state]++;
  return result;
});
const waiting = computed(() => (work.value ? waitingWork(work.value) : null));
// The first thing the page says: how many cases there are, how many of them
// wait, and since or until when.
const todo = computed(() => {
  const value = waiting.value;
  if (!value)
    return { kind: "unknown", lead: t("Commercial.todo.unknown"), rest: "" };
  // Only a complete list can name the total.
  const total =
    state.offset === 0 && state.queue.length < 100 ? state.queue.length : 0;
  if (value.cases) {
    const n = value.cases,
      since = date(value.since),
      key = `Commercial.todo.due${since ? "Since" : ""}${total > n ? "Of" : ""}`;
    return {
      kind: "due",
      lead: t(key, { n, total, date: since }, n),
      rest: partial.value ? t("Commercial.todo.partial") : "",
    };
  }
  const next = date(value.next);
  return {
    kind: "none",
    lead: t("Commercial.todo.none"),
    rest: total
      ? t(
        next ? "Commercial.todo.totalNext" : "Commercial.todo.total",
        { total, date: next },
        total,
      )
      : next
        ? t("Commercial.todo.next", { date: next })
        : "",
  };
});
const chosenFilter = ref<CaseState | "all" | null>(null);
const filter = computed(
  () => chosenFilter.value ?? (counts.value.due ? "due" : "all"),
);
const filters = computed(() =>
  (["due", "later", "clear", "closed"] as const).filter(
    (name) => name === "due" || counts.value[name] > 0,
  ),
);
const visible = computed(() =>
  !work.value || filter.value === "all"
    ? lines.value
    : lines.value.filter((line) => line.state === filter.value),
);
// True from the first step of a reload, so that a session being renewed or
// re-confirmed is shown as loading and never as an error.
const reading = ref(false);
const loading = computed(
  () => reading.value || state.queueBusy || !!hold.value?.state.queueBusy,
);
const ready = computed(
  () => state.authority && !loading.value && !state.queueError,
);
const current = computed(
  () =>
    (state.selected &&
      state.queue.find((row) => row.id === state.selected!.id)) ||
    null,
);
const currentWork = computed(
  () => (state.selected && work.value?.get(state.selected.id)) || null,
);

// The navigation shows the same number without a request of its own.
const shared = useWaitingCounts();
watch(waiting, (value) => {
  if (value)
    shared.value = {
      ...shared.value,
      commercial: { count: value.cases, more: partial.value },
    };
});

// The commercial requests never renew a session. Without this, the page would
// stop loading once the access token has run out. The browser reports the
// renewed cookies a moment later, which empties the page once more; that
// moment is waited out here.
async function renew(margin?: number) {
  const token = app.runWithContext(getAccessToken);
  if (typeof token !== "string" || !accessTokenExpired(token, margin))
    return false;
  await app.runWithContext(() => refresh());
  await new Promise((resolve) => setTimeout(resolve, 50));
  return true;
}
// The case the administrator has open, and whether to return to it once the
// guard has emptied the page on focus.
let reloading: Promise<void> | null = null,
  opened: string | null = null,
  restore = false;
function reload(offset = state.offset) {
  if (reloading) return reloading;
  reading.value = true;
  reloading = (async () => {
    // The guard can empty the page while it loads, on focus or by a late
    // cookie notification. Read again then, three times at most.
    for (let pass = 0; pass < 3; pass++) {
      await renew(180);
      emptied = denied = false;
      await Promise.all([controller.queue(offset), hold.value?.load()]);
      if (state.authority || denied || !emptied) break;
    }
    const row =
      restore && !state.selected && state.queue.find((item) => item.id === opened);
    restore = false;
    if (row) await show(row);
  })().finally(() => {
    reloading = null;
    reading.value = false;
  });
  return reloading;
}
function show(row: StaffCase) {
  controller.select(row);
  opened = row.id;
  return controller.capacity();
}
async function open(row: StaffCase) {
  let target: StaffCase | undefined = row;
  if (await renew(180)) {
    // A renewed session empties the lists; read them again before opening.
    await reload();
    target = state.queue.find((item) => item.id === row.id);
  }
  if (target) await show(target);
}
function back() {
  opened = null;
  controller.select(null);
}
// Named apart from `refresh`, which renews the session.
function update() {
  if (!state.selected) opened = null;
  return reload();
}
// The session guard empties this page whenever the window regains focus.
// Read the lists again and return to the case that was open.
function returned() {
  if (document.visibilityState === "hidden") return;
  restore = true;
  if (!reloading && !state.authority) void reload();
}
// Sending renews a session that is about to run out, which empties the page.
// The lists and the open case return once the answer is in.
async function renewToSend() {
  if (await renew()) restore = true;
}
// A saved review changes what waits; a determination changes the items.
watch(
  () => hold.value?.state.receipt ?? null,
  (receipt) => {
    if (receipt) void reload();
  },
);
watch(
  () => determination.value?.state.receipt ?? null,
  (receipt) => {
    if (!receipt) return;
    if (state.selected) void controller.capacity();
    else if (restore) void reload();
  },
);
onMounted(() => {
  window.addEventListener("focus", returned);
  void reload();
});
onBeforeUnmount(() => {
  window.removeEventListener("focus", returned);
  controller.dispose();
});
</script>

<template>
  <main
    class="commercial grid min-w-0 gap-5 font-body text-body"
    data-commercial
  >
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-heading text-heading-2">{{ t("Commercial.title") }}</h1>
      <button
        type="button"
        data-load-queue
        :disabled="loading"
        @click="update()"
      >
        {{ t("Commercial.loadQueue") }}
      </button>
    </header>
    <p v-if="state.queueError && !reading" role="alert" class="notice">
      {{ message(state.queueError) }}
      <NuxtLink v-if="state.queueError === 'authority'" to="/">{{
        t("Commercial.signIn")
      }}</NuxtLink>
    </p>
    <p v-else-if="!ready" role="status">{{ t("Commercial.loading") }}</p>

    <template v-if="!state.selected">
      <template v-if="ready">
        <p
          class="todo rounded p-4"
          :class="{ waiting: todo.kind === 'due' }"
          :data-todo="todo.kind"
          role="status"
        >
          <strong>{{ todo.lead }}</strong
          >{{ todo.rest ? " " + todo.rest : "" }}
        </p>
        <div
          v-if="work && state.queue.length"
          class="flex flex-wrap gap-2"
          role="group"
          :aria-label="t('Commercial.filter')"
        >
          <button
            v-for="name in filters"
            :key="name"
            type="button"
            class="chip"
            :data-filter="name"
            :aria-pressed="filter === name"
            @click="chosenFilter = name"
          >
            {{ t(`Commercial.states.${name}`) }} · {{ counts[name] }}
          </button>
          <button
            type="button"
            class="chip"
            data-filter="all"
            :aria-pressed="filter === 'all'"
            @click="chosenFilter = 'all'"
          >
            {{ t("Commercial.states.all") }} · {{ lines.length }}
          </button>
        </div>
        <p v-if="!state.queue.length">{{ t("Commercial.emptyQueue") }}</p>
        <p v-else-if="!visible.length">{{ t("Commercial.emptyFilter") }}</p>
        <table v-else class="cases w-full text-left" data-cases>
          <thead>
            <tr>
              <th scope="col">{{ t("Commercial.case") }}</th>
              <th scope="col">{{ t("Commercial.account") }}</th>
              <th scope="col">{{ t("Commercial.work.title") }}</th>
              <th scope="col">{{ t("Commercial.deadline") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="line in visible"
              :key="line.row.id"
              :data-state="work ? line.state : 'unknown'"
            >
              <td :data-label="t('Commercial.case')">
                <button
                  type="button"
                  class="link"
                  :data-case="line.row.id"
                  :title="line.row.id"
                  @click="open(line.row)"
                >
                  {{ short(line.row.id) }}
                </button>
              </td>
              <td :data-label="t('Commercial.account')">
                {{
                  line.row.erased_at
                    ? t("Commercial.erased", { date: day(line.row.erased_at) })
                    : t("Commercial.notErased")
                }}
              </td>
              <td :data-label="t('Commercial.work.title')">
                <template v-if="!work">{{
                  t("Commercial.work.unknown")
                }}</template>
                <strong v-else-if="line.state === 'due'">{{
                  t(
                    "Commercial.work.due",
                    { n: line.work!.due },
                    line.work!.due,
                  )
                }}</strong>
                <template v-else>{{
                  t(`Commercial.work.${line.state}`)
                }}</template>
              </td>
              <td :data-label="t('Commercial.deadline')">
                <span v-if="work && line.state === 'due'" class="late">{{
                  date(line.work!.since)
                    ? t("Commercial.overdue", { date: date(line.work!.since) })
                    : t("Commercial.overdueNow")
                }}</span>
                <template v-else-if="work && line.state === 'later'">{{
                  t("Commercial.nextReview", { date: date(line.work!.next) })
                }}</template>
                <template v-else>–</template>
              </td>
            </tr>
          </tbody>
        </table>
        <nav
          v-if="state.offset > 0 || state.queue.length === 100"
          class="flex flex-wrap items-center gap-3"
          :aria-label="t('Commercial.pages')"
        >
          <button
            type="button"
            :disabled="loading || state.offset === 0"
            @click="reload(Math.max(0, state.offset - 100))"
          >
            {{ t("Commercial.previous") }}
          </button>
          <span>{{
            t("Commercial.range", {
              from: state.offset + 1,
              to: state.offset + state.queue.length,
            })
          }}</span>
          <button
            type="button"
            :disabled="
              loading || state.queue.length !== 100 || state.offset > 2147483547
            "
            @click="reload(state.offset + 100)"
          >
            {{ t("Commercial.next") }}
          </button>
        </nav>
        <details>
          <summary>{{ t("Commercial.aboutTitle") }}</summary>
          <p>{{ t("Commercial.about") }}</p>
        </details>
      </template>
    </template>
    <header v-else class="sheet grid gap-3 rounded p-4" data-selected>
      <button
        type="button"
        class="link w-fit"
        data-back
        @click="back()"
      >
        ← {{ t("Commercial.back") }}
      </button>
      <h2 class="text-heading text-heading-3">
        {{ t("Commercial.case") }} {{ short(state.selected.id) }}
      </h2>
      <p v-if="current">
        {{
          current.erased_at
            ? t("Commercial.accountErased", { date: day(current.erased_at) })
            : t("Commercial.accountKept")
        }}
      </p>
      <p v-if="currentWork?.due" class="late">
        {{ t("Commercial.work.due", { n: currentWork.due }, currentWork.due) }}
      </p>
      <details>
        <summary>{{ t("Commercial.technical") }}</summary>
        <dl class="break-all">
          <dt>{{ t("Commercial.caseId") }}</dt>
          <dd>{{ state.selected.id }}</dd>
          <dt>{{ t("Commercial.subject") }}</dt>
          <dd>{{ state.selected.subject }}</dd>
          <template v-if="current">
            <dt>{{ t("Commercial.reason") }}</dt>
            <dd>{{ current.review_reason }}</dd>
            <dt>{{ t("Commercial.due") }}</dt>
            <dd>{{ current.due_at }}</dd>
            <dt>{{ t("Commercial.assigned") }}</dt>
            <dd>{{ current.assigned_to ?? t("Commercial.unknown") }}</dd>
            <template v-if="current.closed_at">
              <dt>{{ t("Commercial.closed") }}</dt>
              <dd>{{ current.closed_at }}</dd>
            </template>
          </template>
        </dl>
      </details>
    </header>

    <CommercialHoldReview
      ref="hold"
      :class="{ 'sheet rounded p-4': state.selected }"
      :context="context"
      :transport="transport"
      :case-id="state.selected?.id ?? null"
      :renew="renewToSend"
      embedded
    />

    <section
      v-if="state.selected"
      class="sheet grid gap-3 rounded p-4"
      :aria-label="t('Commercial.money')"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-heading text-heading-4">{{ t("Commercial.money") }}</h3>
        <button
          type="button"
          class="quiet"
          data-load-capacity
          :disabled="state.capacityBusy"
          @click="controller.capacity()"
        >
          {{ t("Commercial.loadCapacity") }}
        </button>
      </div>
      <p v-if="state.capacityBusy" role="status">
        {{ t("Commercial.loading") }}
      </p>
      <p v-if="state.capacityError" role="alert" class="notice">
        {{ message(state.capacityError) }}
      </p>
      <article v-if="state.capacity" class="grid gap-3" data-capacity>
        <dl class="figures">
          <div v-for="field in mainAmounts" :key="field">
            <dt>{{ t(`Commercial.amounts.${field}`) }}</dt>
            <dd :data-amount="field">{{ amount(state.capacity[field]) }}</dd>
          </div>
        </dl>
        <details>
          <summary>{{ t("Commercial.capacityHelp") }}</summary>
          <p>{{ t("Commercial.capacityLimit") }}</p>
        </details>
        <h4 class="text-heading">{{ t("Commercial.obligations") }}</h4>
        <p v-if="!state.capacity.obligations.length">
          {{ t("Commercial.noObligations") }}
        </p>
        <div
          v-for="row in state.capacity.obligations"
          :key="row.id"
          class="item"
        >
          <span>{{ itemName(row) }}</span>
          <span>{{ t(`Commercial.obligationStates.${row.status}`) }}</span>
          <span>{{ amount(row.units) }}</span>
          <button
            type="button"
            class="quiet"
            :data-obligation="row.id"
            @click="determination?.open(row.id)"
          >
            {{
              row.status === "pending_evidence"
                ? t("Commercial.determine")
                : t("Commercial.inspect")
            }}
          </button>
        </div>
        <details>
          <summary>{{ t("Commercial.allFigures") }}</summary>
          <div class="grid gap-3 pt-2">
            <p>
              {{ t("Commercial.observed") }}: {{ state.capacity.observed_at }}
            </p>
            <p>
              {{ t(`Commercial.basis.${state.capacity.captured_basis.kind}`) }}
            </p>
            <p>
              {{ t("Commercial.captureCount") }}:
              {{
                state.capacity.captured_basis.live_captured_record_count ??
                t("Commercial.unknown")
              }}
            </p>
            <p v-if="state.capacity.captured_basis.evidence_id">
              {{ t("Commercial.evidence") }}:
              {{ state.capacity.captured_basis.evidence_id }} ·
              {{ state.capacity.captured_basis.recorded_at }}
            </p>
            <p>
              {{
                t(
                  `Commercial.prior.${state.capacity.historic_prior_refund_status}`,
                )
              }}
              <span v-if="state.capacity.historic_prior_refund_review"
                >·
                {{
                  state.capacity.historic_prior_refund_review.reviewed_at
                }}</span
              >
            </p>
            <dl class="grid gap-3">
              <div v-for="field in otherAmounts" :key="field">
                <dt>{{ t(`Commercial.amounts.${field}`) }}</dt>
                <dd :data-amount="field">
                  {{ amount(state.capacity[field]) }}
                </dd>
              </div>
            </dl>
            <p>
              {{ t("Commercial.unknownCapacityCount") }}:
              {{ state.capacity.unknown_reservation_capacity_count }}
            </p>
            <article
              v-for="row in state.capacity.obligations"
              :key="row.id"
              class="grid gap-1 border p-3"
            >
              <p class="break-all">
                {{ row.id }} · {{ row.source }} · {{ row.source_key }} ·
                {{ row.component }}
              </p>
              <p>{{ t(`Commercial.obligationStates.${row.status}`) }}</p>
              <p>
                {{ t("Commercial.originalUnits") }}: {{ amount(row.units) }} ·
                {{ t("Commercial.cashUnits") }}: {{ amount(row.cash_units) }}
              </p>
              <p>
                {{ t("Commercial.remaining") }}:
                {{ amount(row.remaining_units) }} ·
                {{ t("Commercial.remainingCash") }}:
                {{ amount(row.remaining_cash_units) }}
              </p>
              <p>
                {{ t("Commercial.counted") }}:
                {{ amount(row.counted_reservation_units) }} ·
                {{ t("Commercial.countedCash") }}:
                {{ amount(row.counted_cash_reservation_units) }}
              </p>
            </article>
            <h4 class="text-heading">{{ t("Commercial.reservations") }}</h4>
            <p v-if="!state.capacity.reservations.length">
              {{ t("Commercial.noReservations") }}
            </p>
            <article
              v-for="row in state.capacity.reservations"
              :key="row.id"
              class="grid gap-1 border p-3"
            >
              <p class="break-all">
                {{ row.id }} · {{ t(`Commercial.modes.${row.mode}`) }} ·
                {{ t(`Commercial.reservationStates.${row.state}`) }}
              </p>
              <p class="break-all">
                {{ t("Commercial.obligation") }}: {{ row.obligation_id }}
              </p>
              <p v-if="row.parent_id" class="break-all">
                {{ t("Commercial.parent") }}: {{ row.parent_id }}
              </p>
              <p>
                {{ t("Commercial.originalUnits") }}: {{ amount(row.units) }} ·
                {{ t("Commercial.purchaseCapacity") }}:
                {{ amount(row.purchase_capacity_units) }}
              </p>
            </article>
          </div>
        </details>
      </article>
    </section>

    <CommercialDetermination
      ref="determination"
      :class="{ 'sheet rounded p-4': state.selected }"
      :context="context"
      :transport="transport"
      :selected="state.selected"
      :renew="renewToSend"
      embedded
    />

    <template v-if="state.selected">
      <form
        class="sheet grid gap-3 rounded p-4"
        @submit.prevent="controller.document(selector)"
      >
        <h3 class="text-heading text-heading-4">
          {{ t("Commercial.documents") }}
        </h3>
        <p>{{ t("Commercial.knownSelector") }}</p>
        <div class="fields">
          <label
            >{{ t("Commercial.kind")
            }}<select v-model="selector.kind" data-document-kind>
              <option
                v-for="kind in [
                  'invoice',
                  'final-statement',
                  'credit-note',
                  'purchase',
                ]"
                :key="kind"
                :value="kind"
              >
                {{ t(`Commercial.kinds.${kind}`) }}
              </option>
            </select></label
          >
          <label
            >{{
              t(
                selector.kind === "purchase"
                  ? "Commercial.offerId"
                  : selector.kind === "credit-note"
                    ? "Commercial.year"
                    : "Commercial.number",
              )
            }}<input
              v-model="selector.id"
              data-document-id
              autocomplete="off"
              required
          /></label>
          <label
            >{{
              t(
                selector.kind === "credit-note"
                  ? "Commercial.month"
                  : "Commercial.variant",
              )
            }}<select v-model="selector.variant" data-document-variant>
              <option
                v-for="variant in variants"
                :key="variant"
                :value="variant"
              >
                {{
                  selector.kind === "credit-note"
                    ? variant
                    : t(`Commercial.variants.${variant}`)
                }}
              </option>
            </select></label
          >
        </div>
        <button
          type="submit"
          class="w-fit"
          data-download
          :disabled="state.documentBusy"
        >
          {{ t("Commercial.download") }}
        </button>
        <p v-if="state.documentError" role="alert" class="notice">
          {{ message(state.documentError) }}
        </p>
        <p v-if="state.downloaded" role="status" data-downloaded>
          {{ t("Commercial.downloaded") }}
        </p>
      </form>
      <section
        class="sheet grid gap-3 rounded p-4"
        :aria-label="t('Commercial.raw')"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-heading text-heading-4">{{ t("Commercial.raw") }}</h3>
          <button
            type="button"
            class="quiet"
            data-load-detail
            :disabled="state.detailBusy"
            @click="controller.detail()"
          >
            {{ t("Commercial.loadDetail") }}
          </button>
        </div>
        <p>{{ t("Commercial.rawDetail") }}</p>
        <p v-if="state.detailError" role="alert" class="notice">
          {{ message(state.detailError) }}
        </p>
        <article v-if="state.detail" class="grid gap-2" data-detail>
          <p>{{ t("Commercial.reason") }}: {{ state.detail.review_reason }}</p>
          <p>{{ t("Commercial.due") }}: {{ state.detail.review_due_at }}</p>
          <details>
            <summary>{{ t("Commercial.showEvidence") }}</summary>
            <pre data-raw-detail>{{ state.detail.raw }}</pre>
          </details>
        </article>
      </section>
    </template>

    <details class="tool">
      <summary data-retention-open>{{ t("RetentionPage.title") }}</summary>
      <CommercialRetentionPage :context="context" :transport="transport" />
    </details>
  </main>
</template>

<style scoped>
label {
  display: grid;
  gap: 0.4rem;
}
.fields {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}
input,
select {
  color: #111827;
  background: white;
  border: 1px solid #94a3b8;
  border-radius: 0.3rem;
  padding: 0.6rem;
  min-width: 0;
}
button {
  color: var(--color-heading);
  border: 1px solid currentColor;
  padding: 0.5rem 0.75rem;
  border-radius: 0.3rem;
  text-align: start;
}
button.quiet,
button.chip {
  padding: 0.25rem 0.7rem;
  font-size: 0.875rem;
}
button.chip {
  border-radius: 999px;
  border-color: var(--color-light);
}
button.chip[aria-pressed="true"] {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary);
  font-weight: 700;
}
button.link {
  border: 0;
  padding: 0;
  color: var(--color-accent);
  font-weight: 700;
  text-decoration: underline;
}
button:disabled {
  opacity: 0.5;
  cursor: wait;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
summary:focus-visible,
a:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 3px;
}
a {
  color: var(--color-accent);
  text-decoration: underline;
}
summary {
  cursor: pointer;
  color: var(--color-heading);
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 24rem;
  overflow: auto;
}
p,
dd {
  overflow-wrap: anywhere;
}
dt {
  font-weight: 600;
  margin-top: 0.5rem;
}
.notice {
  border-left: 3px solid var(--color-error);
  padding: 0.25rem 0 0.25rem 0.75rem;
  color: var(--color-heading);
}
.late {
  color: #ff8a80;
  font-weight: 700;
}
.todo {
  background: var(--color-secondary);
  border-left: 4px solid var(--color-success);
  color: var(--color-heading);
}
.todo.waiting {
  border-color: var(--color-error);
}
.sheet {
  background: var(--color-secondary);
}
.tool {
  border-top: 1px solid var(--color-light);
  padding-top: 0.75rem;
}
.tool > summary {
  margin-bottom: 0.75rem;
}
.figures {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
}
.figures dt {
  margin: 0;
  font-weight: 400;
}
.figures dd {
  color: var(--color-heading);
  font-size: 1.25rem;
  font-weight: 700;
}
.item {
  display: grid;
  gap: 0.25rem 1rem;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1fr) auto;
  align-items: center;
  border-top: 1px solid var(--color-light);
  padding-top: 0.5rem;
}
.cases th {
  color: var(--color-heading);
  font-weight: 600;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-light);
}
.cases td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-tertiary);
}
/* The whole row opens the case: its button stretches across the row. */
.cases tbody tr {
  position: relative;
  cursor: pointer;
}
.cases button.link::after {
  content: "";
  position: absolute;
  inset: 0;
}
.cases tbody tr:hover {
  background: var(--color-secondary);
}
@media (max-width: 640px) {
  .cases thead {
    display: none;
  }
  .cases,
  .cases tbody,
  .cases tr,
  .cases td {
    display: block;
  }
  .cases tr {
    border: 1px solid var(--color-light);
    border-radius: 0.4rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.6rem;
  }
  .cases td {
    border: 0;
    padding: 0.15rem 0;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    text-align: end;
  }
  .cases td::before {
    content: attr(data-label);
    color: var(--color-body);
    text-align: start;
  }
  .item {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
