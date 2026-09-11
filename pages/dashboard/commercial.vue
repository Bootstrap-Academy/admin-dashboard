<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, watch } from "vue";
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
} from "../../composables/commercialStaff";

definePageMeta({ layout: "dashboard" });
const { t, locale } = useI18n();
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
const transport = staffTransport(
  String(useRuntimeConfig().public.BASE_API_URL),
);
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
const capacityFields = [
  "captured_purchase_units",
  "historic_prior_refund_units",
  "known_reserved_purchase_capacity_units",
  "known_uncertain_purchase_capacity_units",
  "known_recorded_completed_purchase_capacity_units",
  "remaining_purchase_capacity",
] as const;
const amount = (value: string | null) =>
  value === null
    ? t("Commercial.unknown")
    : staffMoney(value).replace(".", locale.value === "de" ? "," : ".");
const message = (error: string) => t(`Commercial.errors.${error}`);
onBeforeUnmount(() => controller.dispose());
</script>

<template>
  <main class="commercial grid min-w-0 gap-6 text-body" data-commercial>
    <h1 class="text-heading text-heading-2">{{ t("Commercial.title") }}</h1>
    <p>{{ t("Commercial.intro") }}</p>
    <p>
      {{ t("Commercial.authentication") }}
      <NuxtLink to="/">{{ t("Commercial.signIn") }}</NuxtLink>
    </p>
    <CommercialHoldReview :context="context" :transport="transport" />
    <CommercialDetermination
      :context="context"
      :transport="transport"
      :selected="state.selected"
    />
    <CommercialRetentionPage :context="context" :transport="transport" />
    <section
      class="grid gap-3 rounded border p-4"
      aria-labelledby="commercial-queue"
    >
      <h2 id="commercial-queue" class="text-heading">
        {{ t("Commercial.queue") }}
      </h2>
      <button
        type="button"
        data-load-queue
        :disabled="state.queueBusy"
        @click="controller.queue(0)"
      >
        {{ t("Commercial.loadQueue") }}
      </button>
      <p v-if="state.queueError" role="alert">
        {{ message(state.queueError) }}
      </p>
      <p>{{ t("Commercial.liveQueue") }}</p>
      <p
        v-if="
          state.authority &&
          !state.queueBusy &&
          !state.queueError &&
          !state.queue.length
        "
      >
        {{ t("Commercial.emptyQueue") }}
      </p>
      <article
        v-for="row in state.queue"
        :key="row.id"
        class="grid gap-2 rounded border p-3"
      >
        <button
          type="button"
          :data-case="row.id"
          @click="controller.select(row)"
        >
          {{ t("Commercial.selectCase") }} {{ row.id }}
        </button>
        <p>{{ t("Commercial.subject") }}: {{ row.subject }}</p>
        <p>{{ row.review_reason }}</p>
        <p>{{ t("Commercial.due") }}: {{ row.due_at }}</p>
        <p>
          {{ t("Commercial.assigned") }}:
          {{ row.assigned_to ?? t("Commercial.unknown") }}
        </p>
        <p v-if="row.erased_at">
          {{ t("Commercial.erased") }}: {{ row.erased_at }}
        </p>
        <p v-if="row.closed_at">
          {{ t("Commercial.closed") }}: {{ row.closed_at }}
        </p>
      </article>
      <nav class="flex flex-wrap gap-3" :aria-label="t('Commercial.queue')">
        <button
          type="button"
          :disabled="state.queueBusy || !state.authority || state.offset === 0"
          @click="controller.queue(Math.max(0, state.offset - 100))"
        >
          {{ t("Commercial.previous") }}
        </button>
        <span>{{ t("Commercial.offset") }} {{ state.offset }}</span>
        <button
          type="button"
          :disabled="
            state.queueBusy ||
            !state.authority ||
            state.queue.length !== 100 ||
            state.offset > 2147483547
          "
          @click="controller.queue(state.offset + 100)"
        >
          {{ t("Commercial.next") }}
        </button>
      </nav>
    </section>
    <section
      v-if="state.selected"
      class="grid gap-4 rounded border p-4"
      data-selected
    >
      <h2 class="text-heading">
        {{ t("Commercial.case") }} {{ state.selected.id }}
      </h2>
      <p>{{ t("Commercial.subject") }}: {{ state.selected.subject }}</p>
      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          data-load-detail
          :disabled="state.detailBusy"
          @click="controller.detail()"
        >
          {{ t("Commercial.loadDetail") }}
        </button>
        <button
          type="button"
          data-load-capacity
          :disabled="state.capacityBusy"
          @click="controller.capacity()"
        >
          {{ t("Commercial.loadCapacity") }}
        </button>
      </div>
      <p v-if="state.detailError" role="alert">
        {{ message(state.detailError) }}
      </p>
      <article v-if="state.detail" class="grid gap-2" data-detail>
        <p>{{ state.detail.review_reason }}</p>
        <p>{{ t("Commercial.due") }}: {{ state.detail.review_due_at }}</p>
        <p>{{ t("Commercial.rawDetail") }}</p>
        <details>
          <summary>{{ t("Commercial.showEvidence") }}</summary>
          <pre data-raw-detail>{{ state.detail.raw }}</pre>
        </details>
      </article>
      <p v-if="state.capacityError" role="alert">
        {{ message(state.capacityError) }}
      </p>
      <article v-if="state.capacity" class="grid gap-3" data-capacity>
        <h3 class="text-heading">{{ t("Commercial.capacity") }}</h3>
        <p>{{ t("Commercial.capacityLimit") }}</p>
        <p>{{ t("Commercial.observed") }}: {{ state.capacity.observed_at }}</p>
        <p>{{ t(`Commercial.basis.${state.capacity.captured_basis.kind}`) }}</p>
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
            t(`Commercial.prior.${state.capacity.historic_prior_refund_status}`)
          }}
          <span v-if="state.capacity.historic_prior_refund_review"
            >·
            {{ state.capacity.historic_prior_refund_review.reviewed_at }}</span
          >
        </p>
        <dl class="grid gap-3">
          <div v-for="field in capacityFields" :key="field">
            <dt>{{ t(`Commercial.amounts.${field}`) }}</dt>
            <dd :data-amount="field">{{ amount(state.capacity[field]) }}</dd>
          </div>
        </dl>
        <p>
          {{ t("Commercial.unknownCapacityCount") }}:
          {{ state.capacity.unknown_reservation_capacity_count }}
        </p>
        <h4>{{ t("Commercial.obligations") }}</h4>
        <article
          v-for="row in state.capacity.obligations"
          :key="row.id"
          class="grid gap-1 border p-3"
        >
          <p>
            {{ row.id }} · {{ row.source }} · {{ row.source_key }} ·
            {{ row.component }}
          </p>
          <p>{{ t(`Commercial.obligationStates.${row.status}`) }}</p>
          <p>
            {{ t("Commercial.originalUnits") }}: {{ amount(row.units) }} ·
            {{ t("Commercial.cashUnits") }}: {{ amount(row.cash_units) }}
          </p>
          <p>
            {{ t("Commercial.remaining") }}: {{ amount(row.remaining_units) }} ·
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
        <h4>{{ t("Commercial.reservations") }}</h4>
        <article
          v-for="row in state.capacity.reservations"
          :key="row.id"
          class="grid gap-1 border p-3"
        >
          <p>
            {{ row.id }} · {{ t(`Commercial.modes.${row.mode}`) }} ·
            {{ t(`Commercial.reservationStates.${row.state}`) }}
          </p>
          <p>{{ t("Commercial.obligation") }}: {{ row.obligation_id }}</p>
          <p v-if="row.parent_id">
            {{ t("Commercial.parent") }}: {{ row.parent_id }}
          </p>
          <p>
            {{ t("Commercial.originalUnits") }}: {{ amount(row.units) }} ·
            {{ t("Commercial.purchaseCapacity") }}:
            {{ amount(row.purchase_capacity_units) }}
          </p>
        </article>
      </article>
      <form
        class="grid gap-3 border p-4"
        @submit.prevent="controller.document(selector)"
      >
        <h3 class="text-heading">{{ t("Commercial.documents") }}</h3>
        <p>{{ t("Commercial.knownSelector") }}</p>
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
            <option v-for="variant in variants" :key="variant" :value="variant">
              {{
                selector.kind === "credit-note"
                  ? variant
                  : t(`Commercial.variants.${variant}`)
              }}
            </option>
          </select></label
        >
        <button type="submit" data-download :disabled="state.documentBusy">
          {{ t("Commercial.download") }}
        </button>
        <p v-if="state.documentError" role="alert">
          {{ message(state.documentError) }}
        </p>
        <p v-if="state.downloaded" role="status">
          {{ t("Commercial.downloaded") }}
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped>
label {
  display: grid;
  gap: 0.4rem;
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
  color: var(--color-body);
  border: 1px solid currentColor;
  padding: 0.6rem;
  border-radius: 0.3rem;
  text-align: start;
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
</style>
