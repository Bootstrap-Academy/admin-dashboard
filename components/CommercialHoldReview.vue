<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { CommercialStaffContext } from "../composables/commercialStaffContext";
import type { StaffTransport } from "../composables/commercialStaff";
import { commercialStorage, registerStaffWork, staffBackupRecords } from "../utils/commercialStorage";
import {
  createCommercialHoldReview,
  holdRequest,
  holdRowKey,
  type HoldRow,
} from "../composables/commercialHoldReview";
import { overviewDate, overviewTime } from "../composables/commercialOverview";
const props = defineProps<{
  context: CommercialStaffContext;
  transport: StaffTransport;
  /** The open case. `null` lists no records; left out, every record is listed. */
  caseId?: string | null;
  /** Renews a session that is about to expire before a review is sent. */
  renew?: () => Promise<unknown>;
  /** The surrounding page already says when the session needs confirming. */
  embedded?: boolean;
}>();
const { t, locale } = useI18n();
const controller = createCommercialHoldReview(
  props.context,
  props.transport,
  commercialStorage,
);
const state = controller.state;
const unregisterWork = registerStaffWork({
  busy: () => state.sendBusy || state.queueBusy,
  snapshot: () => !state.receipt && (state.assessment || state.nextDate || state.scope)
    ? { kind: "hold-review-form", selected: state.selected, assessment: state.assessment, nextDate: state.nextDate, scope: state.scope }
    : null,
  clear: () => controller.forget(),
});
const savedRequest = computed(() =>
  state.saved ? holdRequest(JSON.parse(state.saved.body_json)) : null,
);
// Inside the page the list of cases already reports a session that needs
// confirming and a record list that could not be read.
const notice = computed(() =>
  props.embedded &&
  (state.error === "authority" ||
    (state.error === "unavailable" && props.caseId === null))
    ? ""
    : state.error,
);
const request = (body: string) => holdRequest(JSON.parse(body));
const rows = computed(() =>
  !state.queue
    ? []
    : props.caseId === undefined
      ? state.queue.rows
      : state.queue.rows.filter((row) => row.case_id === props.caseId),
);
// A record picked in another case stays with that case.
const chosen = computed(() =>
  state.selected &&
  (props.caseId === undefined || state.selected.case_id === props.caseId)
    ? state.selected
    : null,
);
const day = (value: string) => overviewDate(overviewTime(value), locale.value);
function due(row: HoldRow) {
  const time = overviewTime(row.review_due_at),
    now =
      (state.queue && overviewTime(state.queue.observed_at)) ?? Date.now();
  if (time === Infinity) return { late: false, text: t("HoldReview.noDate") };
  if (time === null || time <= now)
    return {
      late: true,
      text: day(row.review_due_at)
        ? t("HoldReview.dueSince", { date: day(row.review_due_at) })
        : t("HoldReview.dueNow"),
    };
  return {
    late: false,
    text: t("HoldReview.dueOn", { date: day(row.review_due_at) }),
  };
}
const edit = (
  field: "assessment" | "nextDate" | "scope",
  value: string | boolean,
) =>
  controller.edit(
    field === "assessment" ? String(value) : state.assessment,
    field === "nextDate" ? String(value) : state.nextDate,
    field === "scope" ? Boolean(value) : state.scope,
  );
// Fills the date field with a morning that many months ahead, in local time.
function suggest(months: number) {
  const date = new Date(),
    pad = (n: number) => String(n).padStart(2, "0");
  date.setMonth(date.getMonth() + months);
  const offset = -date.getTimezoneOffset(),
    size = Math.abs(offset);
  edit(
    "nextDate",
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00:00${offset < 0 ? "-" : "+"}${pad(Math.floor(size / 60))}:${pad(size % 60)}`,
  );
}
// Only the first page of the list can say how much is waiting overall.
const head = ref(true);
function load(next = false) {
  head.value = !next;
  return controller.queue(next);
}
async function send() {
  await props.renew?.();
  await controller.send();
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0],
    ticket = controller.beginImport();
  if (!ticket) return;
  try {
    if (file) for (const raw of staffBackupRecords(await file.text(), "bootstrap.staff-hold-review.v1.")) controller.importFile(raw, ticket);
  } catch {
    controller.importError(ticket);
  } finally {
    if (controller.finishImport(ticket)) input.value = "";
  }
}
function download() {
  const raw = controller.exportFile();
  if (raw === null || !savedRequest.value) return;
  const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    ),
    a = document.createElement("a");
  try {
    a.href = url;
    a.download = `hold-review-${savedRequest.value.command_id}.json`;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
  } finally {
    a.remove();
    URL.revokeObjectURL(url);
  }
}
defineExpose({ state, head, load: () => load() });
onBeforeUnmount(() => { unregisterWork(); controller.dispose(); });
</script>

<template>
  <section
    class="hold-review grid min-w-0 gap-3 text-body"
    data-hold-review
    :aria-label="t('HoldReview.title')"
  >
    <div v-if="caseId !== null" class="grid min-w-0 gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-heading text-heading-4">{{ t("HoldReview.title") }}</h3>
        <div class="flex flex-wrap gap-2">
          <button
            class="quiet"
            data-hold-head
            :disabled="state.queueBusy"
            @click="load()"
          >
            {{ t("HoldReview.load") }}
          </button>
          <button
            class="quiet"
            data-hold-next
            :hidden="!state.queue?.next_cursor"
            :disabled="state.queueBusy || !state.queue?.next_cursor"
            @click="load(true)"
          >
            {{ t("HoldReview.next") }}
          </button>
        </div>
      </div>
      <p>{{ t("HoldReview.intro") }}</p>
      <details>
        <summary>{{ t("HoldReview.effectTitle") }}</summary>
        <p>{{ t("HoldReview.effect") }}</p>
      </details>
      <div v-if="state.queue" class="grid min-w-0 gap-2" data-hold-queue>
        <p v-if="rows.length === 0">
          {{
            t(
              state.queue.exhausted && head
                ? "HoldReview.empty"
                : "HoldReview.emptyPage",
            )
          }}
        </p>
        <button
          v-for="row in rows"
          :key="holdRowKey(row)"
          :data-hold-row="holdRowKey(row)"
          class="record"
          :class="{ picked: chosen && holdRowKey(chosen) === holdRowKey(row) }"
          @click="controller.select(row)"
        >
          <span class="break-all"
            >{{ t(`HoldReview.kinds.${row.hold.kind}`) }}
            {{ row.hold.record_id }}</span
          >
          <span :class="{ late: due(row).late }">{{ due(row).text }}</span>
        </button>
        <p v-if="!state.queue.exhausted">{{ t("HoldReview.more") }}</p>
      </div>
      <div
        v-if="chosen"
        data-hold-selected
        class="form grid min-w-0 gap-3 rounded p-4"
      >
        <h4 class="text-heading break-all">
          {{ t(`HoldReview.kinds.${chosen.hold.kind}`) }}
          {{ chosen.hold.record_id }}
        </h4>
        <div
          v-if="chosen.last_review"
          class="whitespace-pre-wrap"
          data-hold-latest
        >
          <p>
            {{
              t("HoldReview.latest", {
                date: day(chosen.last_review.recorded_at),
              })
            }}
          </p>
          <p>{{ chosen.last_review.assessment }}</p>
        </div>
        <p v-else>{{ t("HoldReview.noReview") }}</p>
        <label
          >{{ t("HoldReview.assessment")
          }}<textarea
            data-hold-assessment
            :value="state.assessment"
            rows="3"
            @input="
              edit('assessment', ($event.target as HTMLTextAreaElement).value)
            "
          />
        </label>
        <label
          >{{ t("HoldReview.date")
          }}<input
            data-hold-date
            :value="state.nextDate"
            type="text"
            autocomplete="off"
            placeholder="2027-01-15T09:00:00+01:00"
            @input="edit('nextDate', ($event.target as HTMLInputElement).value)"
        /></label>
        <div class="flex flex-wrap items-center gap-2">
          <span>{{ t("HoldReview.dateHint") }}</span>
          <button class="quiet" data-hold-in="6" @click="suggest(6)">
            {{ t("HoldReview.inHalfYear") }}
          </button>
          <button class="quiet" data-hold-in="12" @click="suggest(12)">
            {{ t("HoldReview.inOneYear") }}
          </button>
        </div>
        <label class="check"
          ><input
            data-hold-scope
            :checked="state.scope"
            type="checkbox"
            @change="edit('scope', ($event.target as HTMLInputElement).checked)"
          />{{ t("HoldReview.scope") }}</label
        >
        <button
          class="main"
          data-hold-prepare
          :disabled="state.sendBusy || !state.scope"
          @click="controller.prepare()"
        >
          {{ t("HoldReview.prepare") }}
        </button>
        <details>
          <summary>{{ t("HoldReview.technical") }}</summary>
          <dl class="break-all">
            <dt>{{ t("HoldReview.case") }}</dt>
            <dd>{{ chosen.case_id }}</dd>
            <dt>{{ t("HoldReview.subject") }}</dt>
            <dd>{{ chosen.subject }}</dd>
            <dt>{{ t("HoldReview.record") }}</dt>
            <dd>{{ chosen.hold.kind }} · {{ chosen.hold.record_id }}</dd>
            <dt>{{ t("HoldReview.incarnation") }}</dt>
            <dd>{{ chosen.incarnation_id }}</dd>
            <dt>{{ t("HoldReview.revision") }}</dt>
            <dd>{{ chosen.review_version }}</dd>
            <dt>{{ t("HoldReview.due") }}</dt>
            <dd>{{ chosen.review_due_at }}</dd>
            <dt>{{ t("HoldReview.basis") }}</dt>
            <dd class="whitespace-pre-wrap">{{ chosen.basis }}</dd>
            <template v-if="chosen.last_review">
              <dt>{{ t("HoldReview.latestBy") }}</dt>
              <dd>
                {{ chosen.last_review.command_id }} ·
                {{ chosen.last_review.actor }} ·
                {{ chosen.last_review.recorded_at }}
              </dd>
            </template>
          </dl>
        </details>
      </div>
    </div>
    <p v-if="notice" role="status" class="notice" data-hold-error>
      {{ t(`HoldReview.errors.${notice}`) }}
    </p>
    <div
      v-if="state.saved && savedRequest"
      data-hold-command
      class="form grid min-w-0 gap-3 rounded p-4"
    >
      <h4 class="text-heading">
        {{
          state.saved.confirmed
            ? t("HoldReview.sent")
            : t("HoldReview.readyToSend")
        }}
      </h4>
      <dl>
        <dt>{{ t("HoldReview.record") }}</dt>
        <dd class="break-all">
          {{ t(`HoldReview.kinds.${savedRequest.hold.kind}`) }}
          {{ savedRequest.hold.record_id }}
        </dd>
        <dt>{{ t("HoldReview.assessmentShort") }}</dt>
        <dd class="whitespace-pre-wrap">{{ savedRequest.assessment }}</dd>
        <dt>{{ t("HoldReview.dateShort") }}</dt>
        <dd>
          {{ day(savedRequest.next_review_at) || savedRequest.next_review_at }}
        </dd>
      </dl>
      <div class="flex flex-wrap gap-3">
        <button
          class="main"
          data-hold-send
          :hidden="state.saved.confirmed"
          :disabled="state.sendBusy"
          @click="send"
        >
          {{
            state.saved.uncertain ? t("HoldReview.retry") : t("HoldReview.send")
          }}
        </button>
        <button data-hold-export @click="download">
          {{ t("HoldReview.export") }}
        </button>
      </div>
      <p v-if="state.saved.uncertain && !state.saved.confirmed">
        {{ t("HoldReview.retryHint") }}
      </p>
      <p v-if="state.saved.receipts.length && !state.receipt">
        {{ t("HoldReview.localHistory") }}
      </p>
      <details>
        <summary>{{ t("HoldReview.technical") }}</summary>
        <p class="break-all">
          {{ t("HoldReview.actor") }} {{ state.saved.actor }} ·
          {{ savedRequest.command_id }}
        </p>
        <pre
          class="overflow-auto whitespace-pre-wrap break-all"
          data-hold-body
          >{{ state.saved.body_json }}</pre
        >
      </details>
    </div>
    <div v-if="state.receipt" data-hold-receipt class="notice good">
      <p>
        {{
          t("HoldReview.receipt", { date: day(state.receipt.next_review_at) })
        }}
      </p>
      <details>
        <summary>{{ t("HoldReview.technical") }}</summary>
        <p class="break-all">
          {{ state.receipt.command_id }} · {{ state.receipt.recorded_at }} ·
          {{ state.receipt.next_review_at }}
        </p>
      </details>
      <p v-if="state.receiptUnsaved">
        {{ t("HoldReview.errors.receiptStorage") }}
      </p>
    </div>
    <details class="grid min-w-0 gap-3" data-hold-recovery>
      <summary>{{ t("HoldReview.recovery") }}</summary>
      <p>{{ t("HoldReview.local") }}</p>
      <div class="flex flex-wrap items-end gap-3">
        <button data-hold-records @click="controller.loadSaved()">
          {{ t("HoldReview.loadSaved") }}
        </button>
        <label
          >{{ t("HoldReview.import")
          }}<input
            data-hold-import
            type="file"
            accept="application/json,.json"
            :disabled="state.sendBusy"
            @change="importFile"
        /></label>
      </div>
      <button
        v-for="record in state.records"
        :key="request(record.body_json).command_id"
        :data-hold-saved="request(record.body_json).command_id"
        class="record"
        :disabled="state.sendBusy"
        @click="controller.selectSaved(request(record.body_json).command_id)"
      >
        <span class="break-all"
          >{{ t(`HoldReview.kinds.${request(record.body_json).hold.kind}`) }}
          {{ request(record.body_json).hold.record_id }}</span
        >
        <span>{{
          record.confirmed
            ? t("HoldReview.recordedHistory")
            : t("HoldReview.pending")
        }}</span>
      </button>
    </details>
  </section>
</template>

<style scoped>
[hidden] {
  display: none !important;
}
label {
  display: grid;
  gap: 0.4rem;
}
label.check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
input:not([type="checkbox"]),
textarea {
  width: 100%;
  min-width: 0;
  padding: 0.5rem;
  background: white;
  color: #111827;
  border: 1px solid #6b7280;
  border-radius: 0.25rem;
}
input[type="checkbox"] {
  margin-top: 0.2rem;
}
button {
  padding: 0.5rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  color: var(--color-heading);
  text-align: start;
}
button.main {
  justify-self: start;
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary);
  font-weight: 700;
}
button.quiet {
  padding: 0.25rem 0.6rem;
  font-size: 0.875rem;
}
button.record {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  border-color: var(--color-light);
  background: var(--color-secondary);
}
button.record.picked {
  border-color: var(--color-accent);
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
summary:focus-visible {
  outline: 3px solid #a78bfa;
  outline-offset: 3px;
}
.form {
  background: var(--color-secondary);
}
.late {
  color: #ff8a80;
  font-weight: 700;
}
.notice {
  border-left: 3px solid var(--color-error);
  padding: 0.25rem 0 0.25rem 0.75rem;
  color: var(--color-heading);
}
.notice.good {
  border-color: var(--color-success);
}
summary {
  cursor: pointer;
  color: var(--color-heading);
}
dt {
  font-weight: 600;
  margin-top: 0.5rem;
}
</style>
