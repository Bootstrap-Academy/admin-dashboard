<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { CommercialStaffContext } from "../composables/commercialStaffContext";
import type {
  CaseSelection,
  StaffTransport,
} from "../composables/commercialStaff";
import { createCommercialDetermination } from "../composables/commercialDetermination";
const props = defineProps<{
  context: CommercialStaffContext;
  transport: StaffTransport;
  selected: CaseSelection | null;
}>();
const { t } = useI18n();
const controller = createCommercialDetermination(
  props.context,
  props.transport,
  () => window.localStorage,
);
const state = controller.state;
watch(
  () => props.selected,
  (value) => controller.setTarget(value),
  { immediate: true, flush: "sync" },
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
const amount = (v: string | null) =>
  v === null ? t("Determination.unknown") : v;
onBeforeUnmount(() => controller.dispose());
</script>

<template>
  <section
    class="determination grid min-w-0 gap-3 rounded border p-4 text-body"
    data-determination
    aria-labelledby="determination-heading"
  >
    <h2 id="determination-heading" class="text-heading">
      {{ t("Determination.title") }}
    </h2>
    <p>{{ t("Determination.intro") }}</p>
    <p>{{ t("Determination.unitsHint") }}</p>
    <p v-if="state.error" role="status" data-determination-error>
      {{ t(`Determination.errors.${state.error}`) }}
    </p>
    <div v-if="state.target" class="grid gap-3" data-determination-target>
      <p class="break-all">
        {{ t("Determination.case") }}: {{ state.target.id }} ·
        {{ t("Determination.subject") }}: {{ state.target.subject }}
      </p>
      <label
        >{{ t("Determination.obligation")
        }}<input
          data-determination-obligation
          :value="state.obligation"
          autocomplete="off"
          @input="
            controller.editObligation(($event.target as HTMLInputElement).value)
          "
      /></label>
      <button
        data-determination-status
        :disabled="state.liveBusy"
        @click="controller.loadStatus()"
      >
        {{ t("Determination.load") }}
      </button>
    </div>
    <p v-else>{{ t("Determination.selectCase") }}</p>
    <div v-if="state.live" class="grid gap-3" data-determination-live>
      <p>{{ t("Determination.observed") }}: {{ state.live.observed_at }}</p>
      <p>
        {{ t("Determination.current") }}: {{ state.live.obligation.status }} ·
        {{ amount(state.live.obligation.units) }} /
        {{ amount(state.live.obligation.cash_units) }}
      </p>
      <p class="break-all">
        {{ state.live.obligation.source }} ·
        {{ state.live.obligation.source_key }} ·
        {{ state.live.obligation.component }}
      </p>
      <details>
        <summary>{{ t("Determination.original") }}</summary>
        <pre data-determination-original>{{
          state.live.obligation.original_json
        }}</pre>
      </details>
      <details>
        <summary>{{ t("Determination.storedDetermination") }}</summary>
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
        <label class="flex items-start gap-2"
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
            rows="4"
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
        <label class="flex items-start gap-2"
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
          data-determination-prepare
          :disabled="state.sendBusy || !state.confirm"
          @click="controller.prepare()"
        >
          {{ t("Determination.prepare") }}
        </button>
      </div>
      <p v-else>{{ t("Determination.notPending") }}</p>
    </div>
    <div class="grid gap-3 border-t pt-3" data-determination-recovery>
      <h3 class="text-heading">{{ t("Determination.recovery") }}</h3>
      <p>{{ t("Determination.local") }}</p>
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
      <button
        v-for="record in state.records"
        :key="record.command_id"
        :data-determination-saved="record.command_id"
        class="break-all text-left"
        @click="controller.selectSaved(record.command_id)"
      >
        {{ record.command_id }} · {{ record.actor }} ·
        {{
          record.receipts.length
            ? t("Determination.savedHistory")
            : t("Determination.pending")
        }}
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
      <div v-if="state.saved" class="grid gap-3" data-determination-command>
        <p class="break-all">
          {{ t("Determination.command") }}: {{ state.saved.command_id }} ·
          {{ t("Determination.actor") }}: {{ state.saved.actor }}
        </p>
        <p class="break-all">
          {{ state.saved.case_id }} · {{ state.saved.subject }} ·
          {{ state.saved.obligation_id }}
        </p>
        <p v-if="state.saved.uncertain" data-determination-uncertain>
          {{ t("Determination.uncertain") }}
        </p>
        <p v-if="state.saved.claimed_receipts.length">
          {{ t("Determination.claimed") }}
        </p>
        <details>
          <summary>{{ t("Determination.exactBody") }}</summary>
          <pre data-determination-body>{{ state.saved.body_json }}</pre>
        </details>
        <div class="flex flex-wrap gap-3">
          <button data-determination-download @click="download">
            {{ t("Determination.download") }}
          </button>
          <button
            data-determination-reconcile
            :disabled="state.recoveryBusy || state.sendBusy"
            @click="controller.loadStatus(true)"
          >
            {{ t("Determination.reconcile") }}
          </button>
          <button
            data-determination-send
            :disabled="state.sendBusy"
            @click="controller.send()"
          >
            {{
              state.saved.uncertain
                ? t("Determination.retry")
                : t("Determination.send")
            }}
          </button>
        </div>
        <p>{{ t("Determination.sendHint") }}</p>
      </div>
      <div v-if="state.recovery" class="grid gap-2" data-determination-history>
        <p>
          {{ t("Determination.observed") }}: {{ state.recovery.observed_at }}
        </p>
        <p>
          {{ t("Determination.current") }}:
          {{ state.recovery.obligation.status }} ·
          {{ amount(state.recovery.obligation.units) }} /
          {{ amount(state.recovery.obligation.cash_units) }}
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
          <pre>{{ state.recovery.journal.request_json }}</pre>
          <pre>{{ state.recovery.journal.result_json }}</pre>
        </details>
      </div>
      <p v-if="state.receipt" data-determination-receipt>
        {{ t("Determination.receipt") }}
      </p>
      <p v-if="state.receiptUnsaved" data-determination-receipt-unsaved>
        {{ t("Determination.receiptUnsaved") }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.determination button {
  border: 1px solid currentColor;
  border-radius: 0.25rem;
  padding: 0.4rem 0.7rem;
}
.determination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.determination :is(button, input, textarea, summary):focus-visible {
  outline: 3px solid currentColor;
  outline-offset: 3px;
}
.determination input:not([type="checkbox"]),
.determination textarea {
  display: block;
  width: 100%;
  padding: 0.4rem;
  background: white;
  color: #111827;
}
.determination input[type="checkbox"] {
  margin-top: 0.3rem;
}
.determination pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
