<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import type { CommercialStaffContext } from "../composables/commercialStaffContext";
import type { StaffTransport } from "../composables/commercialStaff";
import {
  createCommercialHoldReview,
  holdRequest,
  holdRowKey,
} from "../composables/commercialHoldReview";
const props = defineProps<{
  context: CommercialStaffContext;
  transport: StaffTransport;
}>();
const { t } = useI18n();
const controller = createCommercialHoldReview(
  props.context,
  props.transport,
  () => window.localStorage,
);
const state = controller.state;
const savedRequest = computed(() =>
  state.saved ? holdRequest(JSON.parse(state.saved.body_json)) : null,
);
const request = (body: string) => holdRequest(JSON.parse(body));
const edit = (
  field: "assessment" | "nextDate" | "scope",
  value: string | boolean,
) =>
  controller.edit(
    field === "assessment" ? String(value) : state.assessment,
    field === "nextDate" ? String(value) : state.nextDate,
    field === "scope" ? Boolean(value) : state.scope,
  );
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0],
    ticket = controller.beginImport();
  if (!ticket) return;
  try {
    if (file) controller.importFile(await file.text(), ticket);
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
onBeforeUnmount(() => controller.dispose());
</script>

<template>
  <section
    class="hold-review grid min-w-0 gap-3 rounded border p-4 text-body"
    data-hold-review
    aria-labelledby="hold-heading"
  >
    <h2 id="hold-heading" class="text-heading">{{ t("HoldReview.title") }}</h2>
    <p>{{ t("HoldReview.intro") }}</p>
    <p>{{ t("HoldReview.live") }}</p>
    <div class="flex flex-wrap gap-3">
      <button
        data-hold-head
        :disabled="state.queueBusy"
        @click="controller.queue()"
      >
        {{ t("HoldReview.load") }}
      </button>
      <button
        data-hold-next
        :disabled="state.queueBusy || !state.queue?.next_cursor"
        @click="controller.queue(true)"
      >
        {{ t("HoldReview.next") }}
      </button>
      <button data-hold-records @click="controller.loadSaved()">
        {{ t("HoldReview.loadSaved") }}
      </button>
    </div>
    <p v-if="state.error" role="status" data-hold-error>
      {{ t(`HoldReview.errors.${state.error}`) }}
    </p>
    <div v-if="state.queue" class="grid gap-3" data-hold-queue>
      <p>{{ t("HoldReview.observed") }} {{ state.queue.observed_at }}</p>
      <p v-if="state.queue.rows.length === 0">{{ t("HoldReview.empty") }}</p>
      <button
        v-for="row in state.queue.rows"
        :key="holdRowKey(row)"
        :data-hold-row="holdRowKey(row)"
        class="break-all text-left"
        @click="controller.select(row)"
      >
        {{ t(`HoldReview.kinds.${row.hold.kind}`) }} ·
        {{ row.hold.record_id }} · {{ row.case_id }} · {{ row.review_due_at }}
      </button>
      <p v-if="state.queue.exhausted">{{ t("HoldReview.exhausted") }}</p>
    </div>
    <div
      v-if="state.selected"
      data-hold-selected
      class="grid min-w-0 gap-3 border-t pt-3"
    >
      <h3 class="text-heading">{{ t("HoldReview.selected") }}</h3>
      <dl class="break-all">
        <dt>{{ t("HoldReview.case") }}</dt>
        <dd>{{ state.selected.case_id }}</dd>
        <dt>{{ t("HoldReview.subject") }}</dt>
        <dd>{{ state.selected.subject }}</dd>
        <dt>{{ t("HoldReview.record") }}</dt>
        <dd>
          {{ state.selected.hold.kind }} · {{ state.selected.hold.record_id }}
        </dd>
        <dt>{{ t("HoldReview.incarnation") }}</dt>
        <dd>{{ state.selected.incarnation_id }}</dd>
        <dt>{{ t("HoldReview.revision") }}</dt>
        <dd>{{ state.selected.review_version }}</dd>
        <dt>{{ t("HoldReview.due") }}</dt>
        <dd>{{ state.selected.review_due_at }}</dd>
        <dt>{{ t("HoldReview.basis") }}</dt>
        <dd class="whitespace-pre-wrap">{{ state.selected.basis }}</dd>
      </dl>
      <div
        v-if="state.selected.last_review"
        class="break-all whitespace-pre-wrap"
        data-hold-latest
      >
        <p>{{ t("HoldReview.latest") }}</p>
        <p>
          {{ state.selected.last_review.command_id }} ·
          {{ state.selected.last_review.actor }} ·
          {{ state.selected.last_review.recorded_at }}
        </p>
        <p>{{ state.selected.last_review.assessment }}</p>
      </div>
      <p v-else>{{ t("HoldReview.noReview") }}</p>
      <label
        >{{ t("HoldReview.assessment")
        }}<textarea
          data-hold-assessment
          :value="state.assessment"
          rows="4"
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
          @input="edit('nextDate', ($event.target as HTMLInputElement).value)"
      /></label>
      <p>{{ t("HoldReview.dateHint") }}</p>
      <label class="flex items-start gap-2"
        ><input
          data-hold-scope
          :checked="state.scope"
          type="checkbox"
          @change="edit('scope', ($event.target as HTMLInputElement).checked)"
        />{{ t("HoldReview.scope") }}</label
      >
      <button
        data-hold-prepare
        :disabled="state.sendBusy || !state.scope"
        @click="controller.prepare()"
      >
        {{ t("HoldReview.prepare") }}
      </button>
    </div>
    <div class="grid min-w-0 gap-3 border-t pt-3" data-hold-recovery>
      <h3 class="text-heading">{{ t("HoldReview.recovery") }}</h3>
      <p>{{ t("HoldReview.local") }}</p>
      <label
        >{{ t("HoldReview.import")
        }}<input
          data-hold-import
          type="file"
          accept="application/json,.json"
          :disabled="state.sendBusy"
          @change="importFile"
      /></label>
      <button
        v-for="record in state.records"
        :key="request(record.body_json).command_id"
        :data-hold-saved="request(record.body_json).command_id"
        class="break-all text-left"
        :disabled="state.sendBusy"
        @click="controller.selectSaved(request(record.body_json).command_id)"
      >
        {{ request(record.body_json).command_id }} · {{ record.actor }} ·
        {{
          record.confirmed
            ? t("HoldReview.recordedHistory")
            : t("HoldReview.pending")
        }}
      </button>
      <div
        v-if="state.saved && savedRequest"
        data-hold-command
        class="grid min-w-0 gap-3"
      >
        <p class="break-all">
          {{ t("HoldReview.actor") }} {{ state.saved.actor }} ·
          {{ savedRequest.command_id }}
        </p>
        <p>{{ t("HoldReview.exact") }}</p>
        <pre
          class="overflow-auto whitespace-pre-wrap break-all"
          data-hold-body
          >{{ state.saved.body_json }}</pre
        >
        <button data-hold-export @click="download">
          {{ t("HoldReview.export") }}
        </button>
        <button
          data-hold-send
          :disabled="state.sendBusy"
          @click="controller.send()"
        >
          {{
            state.saved.uncertain ? t("HoldReview.retry") : t("HoldReview.send")
          }}
        </button>
        <p>{{ t("HoldReview.retryHint") }}</p>
        <p v-if="state.saved.receipts.length">
          {{ t("HoldReview.localHistory") }}
        </p>
      </div>
      <div v-if="state.receipt" data-hold-receipt class="break-all">
        <p>{{ t("HoldReview.receipt") }}</p>
        <p>
          {{ state.receipt.command_id }} · {{ state.receipt.recorded_at }} ·
          {{ state.receipt.next_review_at }}
        </p>
        <p>{{ t("HoldReview.historyOnly") }}</p>
        <p v-if="state.receiptUnsaved">
          {{ t("HoldReview.errors.receiptStorage") }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
label {
  display: grid;
  gap: 0.4rem;
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
  color: inherit;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 3px solid #a78bfa;
  outline-offset: 3px;
}
dt {
  font-weight: 600;
  margin-top: 0.5rem;
}
</style>
