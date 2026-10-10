<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  CommercialStaffContext,
  StaffReadiness,
} from "../composables/commercialStaffContext";
import type {
  CaseSelection,
  StaffTransport,
} from "../composables/commercialStaff";
import {
  createCommercialDetermination,
  determinationRequest,
} from "../composables/commercialDetermination";
import { commercialStorage, registerStaffWork, staffBackupRecords } from "../utils/commercialStorage";
const props = defineProps<{
  context: CommercialStaffContext;
  transport: StaffTransport;
  selected: CaseSelection | null;
  /** Renews a session that is about to expire before a determination is sent. */
  renew?: () => Promise<unknown>;
  /** Asked before an item or the server's record of a command is read. */
  ready?: () => Promise<StaffReadiness>;
  /** The surrounding page already says when the session needs confirming. */
  embedded?: boolean;
}>();
const { t, locale } = useI18n();
const controller = createCommercialDetermination(
  props.context,
  props.transport,
  commercialStorage,
);
const state = controller.state;
const unregisterWork = registerStaffWork({
  busy: () => state.sendBusy || state.liveBusy || state.recoveryBusy,
  snapshot: () => !state.receipt && (state.obligation || state.units || state.cash || state.cashKnown || state.cashBasis || state.assessment || state.summary || state.referenceKind || state.reference)
    ? { kind: "determination-form", target: state.target, obligation: state.obligation, units: state.units,
      cash: state.cash, cashKnown: state.cashKnown, cashBasis: state.cashBasis, assessment: state.assessment,
      summary: state.summary, referenceKind: state.referenceKind, reference: state.reference }
    : null,
  clear: () => controller.forget(),
});
watch(
  () => props.selected,
  (value) => controller.setTarget(value),
  { immediate: true, flush: "sync" },
);
// The saved text stays the original; this is only a readable view of it.
const savedRequest = computed(() => {
  try {
    return state.saved ? determinationRequest(state.saved.body_json) : null;
  } catch {
    return null;
  }
});
function open(obligation: string) {
  controller.editObligation(obligation);
  return controller.loadStatus();
}
async function openTyped() {
  // A renewal reads the case again, which empties the identifier field.
  const obligation = state.obligation;
  if (props.ready && !(await props.ready())) return;
  if (state.obligation !== obligation) controller.editObligation(obligation);
  await controller.loadStatus();
}
async function reconcile() {
  if (props.ready && !(await props.ready())) return;
  await controller.loadStatus(true);
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
    if (file) for (const raw of staffBackupRecords(await file.text(), "bootstrap.staff-determination.v1.")) controller.importFile(raw, ticket);
  } catch {
    controller.importError(ticket);
  } finally {
    if (controller.finishImport(ticket)) input.value = "";
  }
}
function download() {
  const raw = controller.exportFile(),
    id = state.saved?.command_id;
  if (raw === null || !id) return;
  const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    ),
    anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = `determination-${id}.json`;
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
// Stored whole units: 100 units are 1 EUR.
function amount(v: string | null) {
  if (v === null) return t("Determination.unknown");
  const digits = v.padStart(3, "0");
  return `${digits.slice(0, -2)}${locale.value === "de" ? "," : "."}${digits.slice(-2)} EUR`;
}
const status = (value: string) => t(`Determination.states.${value}`);
defineExpose({ state, open });
onBeforeUnmount(() => { unregisterWork(); controller.dispose(); });
</script>

<template>
  <section
    class="determination grid min-w-0 gap-3 text-body"
    data-determination
    :aria-label="t('Determination.title')"
  >
    <div v-if="state.target" class="grid gap-3" data-determination-target>
      <h3 class="text-heading text-heading-4">
        {{ t("Determination.title") }}
      </h3>
      <p v-if="!state.live">{{ t("Determination.intro") }}</p>
      <details>
        <summary>{{ t("Determination.byId") }}</summary>
        <div class="grid gap-3 pt-2">
          <label
            >{{ t("Determination.obligation")
            }}<input
              data-determination-obligation
              :value="state.obligation"
              autocomplete="off"
              @input="
                controller.editObligation(
                  ($event.target as HTMLInputElement).value,
                )
              "
          /></label>
          <button
            data-determination-status
            :disabled="state.liveBusy"
            @click="openTyped()"
          >
            {{ t("Determination.load") }}
          </button>
        </div>
      </details>
    </div>
    <p
      v-if="state.error && !(embedded && state.error === 'authority')"
      role="status"
      class="notice"
      data-determination-error
    >
      {{ t(`Determination.errors.${state.error}`) }}
    </p>
    <div
      v-if="state.live"
      class="form grid gap-3 rounded p-4"
      data-determination-live
    >
      <h4 class="text-heading">
        {{ status(state.live.obligation.status) }} ·
        {{ amount(state.live.obligation.units) }}
        <template v-if="state.live.obligation.cash_units !== null"
          >({{
            t("Determination.cashPart", {
              amount: amount(state.live.obligation.cash_units),
            })
          }})</template
        >
      </h4>
      <details>
        <summary>{{ t("Determination.record") }}</summary>
        <p>{{ t("Determination.observed") }}: {{ state.live.observed_at }}</p>
        <p class="break-all">
          {{ state.live.obligation.id }} · {{ state.live.obligation.source }} ·
          {{ state.live.obligation.source_key }} ·
          {{ state.live.obligation.component }}
        </p>
        <p>{{ t("Determination.original") }}</p>
        <pre data-determination-original>{{
          state.live.obligation.original_json
        }}</pre>
        <p>{{ t("Determination.storedDetermination") }}</p>
        <pre>{{
          state.live.obligation.determination_json === null
            ? t("Determination.sqlNull")
            : state.live.obligation.determination_json
        }}</pre>
      </details>
      <div
        v-if="state.live.obligation.status === 'pending_evidence'"
        class="grid gap-3"
        data-determination-form
      >
        <label
          >{{ t("Determination.units")
          }}<input
            data-determination-units
            :value="state.units"
            :readonly="state.live.obligation.units !== null"
            inputmode="numeric"
            @input="
              controller.edit(
                'units',
                ($event.target as HTMLInputElement).value,
              )
            "
        /></label>
        <p>{{ t("Determination.unitsHint") }}</p>
        <label class="check"
          ><input
            data-determination-cash-known
            type="checkbox"
            :checked="state.cashKnown"
            @change="
              controller.edit(
                'cashKnown',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />{{ t("Determination.cashKnown") }}</label
        >
        <template v-if="state.cashKnown">
          <label
            >{{ t("Determination.cash")
            }}<input
              data-determination-cash
              :value="state.cash"
              inputmode="numeric"
              @input="
                controller.edit(
                  'cash',
                  ($event.target as HTMLInputElement).value,
                )
              "
          /></label>
          <label
            >{{ t("Determination.cashBasis")
            }}<textarea
              data-determination-cash-basis
              :value="state.cashBasis"
              rows="3"
              @input="
                controller.edit(
                  'cashBasis',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </label>
        </template>
        <label
          >{{ t("Determination.assessment")
          }}<textarea
            data-determination-assessment
            :value="state.assessment"
            rows="3"
            @input="
              controller.edit(
                'assessment',
                ($event.target as HTMLTextAreaElement).value,
              )
            "
          />
        </label>
        <label
          >{{ t("Determination.summary")
          }}<textarea
            data-determination-summary
            :value="state.summary"
            rows="3"
            @input="
              controller.edit(
                'summary',
                ($event.target as HTMLTextAreaElement).value,
              )
            "
          />
        </label>
        <label
          >{{ t("Determination.referenceKind")
          }}<input
            data-determination-reference-kind
            :value="state.referenceKind"
            @input="
              controller.edit(
                'referenceKind',
                ($event.target as HTMLInputElement).value,
              )
            "
        /></label>
        <label
          >{{ t("Determination.reference")
          }}<input
            data-determination-reference
            :value="state.reference"
            @input="
              controller.edit(
                'reference',
                ($event.target as HTMLInputElement).value,
              )
            "
        /></label>
        <label class="check"
          ><input
            data-determination-confirm
            type="checkbox"
            :checked="state.confirm"
            @change="
              controller.edit(
                'confirm',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />{{ t("Determination.confirm") }}</label
        >
        <button
          class="main"
          data-determination-prepare
          :disabled="state.sendBusy || !state.confirm"
          @click="controller.prepare()"
        >
          {{ t("Determination.prepare") }}
        </button>
      </div>
      <p v-else>{{ t("Determination.notPending") }}</p>
    </div>
    <div
      v-if="state.saved"
      class="form grid gap-3 rounded p-4"
      data-determination-command
    >
      <h4 class="text-heading">
        {{
          state.receipt
            ? t("Determination.sent")
            : t("Determination.readyToSend")
        }}
      </h4>
      <dl v-if="savedRequest">
        <dt>{{ t("Determination.unitsShort") }}</dt>
        <dd>
          {{ amount(savedRequest.units) }}
          <template v-if="savedRequest.cash_units !== null"
            >({{
              t("Determination.cashPart", {
                amount: amount(savedRequest.cash_units),
              })
            }})</template
          >
        </dd>
        <dt>{{ t("Determination.assessmentShort") }}</dt>
        <dd class="whitespace-pre-wrap">{{ savedRequest.assessment }}</dd>
        <dt>{{ t("Determination.summaryShort") }}</dt>
        <dd class="whitespace-pre-wrap">{{ savedRequest.evidence.summary }}</dd>
      </dl>
      <p v-if="state.saved.uncertain && !state.receipt" data-determination-uncertain>
        {{ t("Determination.uncertain") }}
      </p>
      <p v-if="state.saved.claimed_receipts.length">
        {{ t("Determination.claimed") }}
      </p>
      <div class="flex flex-wrap gap-3">
        <button
          class="main"
          data-determination-send
          :hidden="!!state.receipt"
          :disabled="state.sendBusy"
          @click="send"
        >
          {{
            state.saved.uncertain
              ? t("Determination.retry")
              : t("Determination.send")
          }}
        </button>
        <button
          data-determination-reconcile
          :disabled="state.recoveryBusy || state.sendBusy"
          @click="reconcile()"
        >
          {{ t("Determination.reconcile") }}
        </button>
        <button data-determination-download @click="download">
          {{ t("Determination.download") }}
        </button>
      </div>
      <details>
        <summary>{{ t("Determination.technical") }}</summary>
        <p class="break-all">
          {{ t("Determination.command") }}: {{ state.saved.command_id }} ·
          {{ t("Determination.actor") }}: {{ state.saved.actor }}
        </p>
        <p class="break-all">
          {{ state.saved.case_id }} · {{ state.saved.subject }} ·
          {{ state.saved.obligation_id }}
        </p>
        <pre data-determination-body>{{ state.saved.body_json }}</pre>
      </details>
    </div>
    <div
      v-if="state.recovery"
      class="grid gap-2"
      data-determination-history
      :data-status="state.recovery.obligation.status"
    >
      <p>
        {{ t("Determination.current") }}:
        {{ status(state.recovery.obligation.status) }} ·
        {{ amount(state.recovery.obligation.units) }}
        <template v-if="state.recovery.obligation.cash_units !== null"
          >({{
            t("Determination.cashPart", {
              amount: amount(state.recovery.obligation.cash_units),
            })
          }})</template
        >
      </p>
      <p v-if="!state.recovery.journal" data-determination-no-journal>
        {{ t("Determination.noJournal") }}
      </p>
      <details v-else>
        <summary>
          {{ t("Determination.serverHistory") }} ·
          {{ state.recovery.journal.id }} ·
          {{ state.recovery.journal.recorded_at }}
        </summary>
        <p>
          {{ t("Determination.observed") }}: {{ state.recovery.observed_at }}
        </p>
        <pre>{{ state.recovery.journal.request_json }}</pre>
        <pre>{{ state.recovery.journal.result_json }}</pre>
      </details>
    </div>
    <p v-if="state.receipt" class="notice good" data-determination-receipt>
      {{ t("Determination.receipt") }}
    </p>
    <p v-if="state.receiptUnsaved" class="notice" data-determination-receipt-unsaved>
      {{ t("Determination.receiptUnsaved") }}
    </p>
    <details class="grid gap-3" data-determination-recovery>
      <summary>{{ t("Determination.recovery") }}</summary>
      <p>{{ t("Determination.local") }}</p>
      <div class="flex flex-wrap items-end gap-3">
        <button data-determination-records @click="controller.loadSaved()">
          {{ t("Determination.loadSaved") }}
        </button>
        <label
          >{{ t("Determination.import")
          }}<input
            data-determination-import
            type="file"
            accept="application/json,.json"
            :disabled="state.sendBusy"
            @change="importFile"
        /></label>
      </div>
      <button
        v-for="record in state.records"
        :key="record.command_id"
        :data-determination-saved="record.command_id"
        class="record"
        @click="controller.selectSaved(record.command_id)"
      >
        <span class="break-all">{{ record.command_id }}</span>
        <span class="break-all"
          >{{ t("Determination.actor") }} {{ record.actor }} ·
          {{
            record.receipts.length
              ? t("Determination.savedHistory")
              : t("Determination.pending")
          }}</span
        >
      </button>
      <details v-for="record in state.unsupported" :key="record.key">
        <summary>
          {{ t("Determination.unsupported") }} · {{ record.key }}
        </summary>
        <pre>{{ record.raw }}</pre>
      </details>
      <details v-if="state.importRaw" data-determination-unsupported>
        <summary>{{ t("Determination.unsupported") }}</summary>
        <p>{{ t("Determination.keepOriginalFile") }}</p>
        <pre>{{ state.importRaw }}</pre>
      </details>
    </details>
  </section>
</template>

<style scoped>
.determination [hidden] {
  display: none !important;
}
.determination label {
  display: grid;
  gap: 0.4rem;
}
.determination label.check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.determination button {
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  padding: 0.5rem 0.75rem;
  color: var(--color-heading);
  text-align: start;
}
.determination button.main {
  justify-self: start;
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-primary);
  font-weight: 700;
}
.determination button.record {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  border-color: var(--color-light);
  background: var(--color-secondary);
}
.determination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.determination :is(button, input, textarea, summary):focus-visible {
  outline: 3px solid #a78bfa;
  outline-offset: 3px;
}
.determination input:not([type="checkbox"]),
.determination textarea {
  display: block;
  width: 100%;
  padding: 0.5rem;
  background: white;
  color: #111827;
  border: 1px solid #6b7280;
  border-radius: 0.25rem;
}
.determination input[type="checkbox"] {
  margin-top: 0.3rem;
}
.determination pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.determination .form {
  background: var(--color-secondary);
}
.determination .notice {
  border-left: 3px solid var(--color-error);
  padding: 0.25rem 0 0.25rem 0.75rem;
  color: var(--color-heading);
}
.determination .notice.good {
  border-color: var(--color-success);
}
.determination summary {
  cursor: pointer;
  color: var(--color-heading);
}
.determination dt {
  font-weight: 600;
  margin-top: 0.5rem;
}
</style>
