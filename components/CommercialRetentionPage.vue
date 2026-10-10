<script setup lang="ts">
import { onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import type {
  CommercialStaffContext,
  StaffReadiness,
} from "../composables/commercialStaffContext";
import type { StaffTransport } from "../composables/commercialStaff";
import {
  createCommercialRetentionPage,
  retentionFamilies,
  retentionFields,
  retentionRowKey,
} from "../composables/commercialRetentionPage";
const props = defineProps<{
  context: CommercialStaffContext;
  transport: StaffTransport;
  /** Asked before a page of records is read. */
  ready?: () => Promise<StaffReadiness>;
}>();
const { t } = useI18n();
const controller = createCommercialRetentionPage(
  props.context,
  props.transport,
);
const state = controller.state;
const valueText = (value: string | boolean | null) =>
  value === null
    ? t("RetentionPage.noStoredValue")
    : typeof value === "boolean"
      ? t(value ? "RetentionPage.recordedYes" : "RetentionPage.recordedNo")
      : value === ""
        ? t("RetentionPage.emptyText")
        : value;
const raw = (key: string) =>
  key === "assessment_json" || key === "evidence_json";
// A renewed session has emptied the list, so its next page is gone as well:
// the list then starts again from the first page.
async function read(mode: "first" | "next" | "restart") {
  const answer = props.ready ? await props.ready() : "same";
  if (!answer) return;
  if (mode === "restart") await controller.restart();
  else if (mode === "next" && answer === "same") await controller.next();
  else await controller.first();
}
onBeforeUnmount(() => controller.dispose());
</script>

<template>
  <section
    class="retention-page grid min-w-0 gap-3 text-body"
    data-retention-page
    :aria-label="t('RetentionPage.title')"
  >
    <p>{{ t("RetentionPage.intro") }}</p>
    <label class="grid gap-1">
      {{ t("RetentionPage.family") }}
      <select
        class="rounded border bg-[#0b192e] p-2 text-heading"
        data-retention-family
        :value="state.family"
        @change="
          controller.selectFamily(($event.target as HTMLSelectElement).value)
        "
      >
        <option
          v-for="family in retentionFamilies"
          :key="family"
          :value="family"
        >
          {{ t(`RetentionPage.families.${family}`) }}
        </option>
      </select>
    </label>
    <nav
      class="flex flex-wrap gap-3"
      :aria-label="t('RetentionPage.navigation')"
    >
      <button
        type="button"
        class="rounded border px-3 py-2 text-heading"
        data-retention-first
        :disabled="state.busy"
        @click="read('first')"
      >
        {{ t("RetentionPage.first") }}
      </button>
      <button
        type="button"
        class="rounded border px-3 py-2 text-heading"
        data-retention-next
        :disabled="state.busy || !state.page?.next_cursor"
        @click="read('next')"
      >
        {{ t("RetentionPage.next") }}
      </button>
      <button
        type="button"
        class="rounded border px-3 py-2 text-heading"
        data-retention-restart
        :disabled="state.busy"
        @click="read('restart')"
      >
        {{ t("RetentionPage.restart") }}
      </button>
    </nav>
    <p v-if="state.busy" role="status" data-retention-busy>
      {{ t("RetentionPage.loading") }}
    </p>
    <p v-if="state.error" role="alert" data-retention-error>
      {{ t(`RetentionPage.errors.${state.error}`) }}
    </p>
    <div
      v-if="state.page"
      class="grid min-w-0 gap-3"
      data-retention-observation
    >
      <p>{{ t("RetentionPage.count", { count: state.page.rows.length }) }}</p>
      <p class="break-words">
        {{ t("RetentionPage.observed") }}:
        <span data-retention-observed>{{ state.page.observed_at }}</span>
      </p>
      <p data-retention-continuation>
        {{
          t(
            state.page.exhausted
              ? "RetentionPage.exhausted"
              : "RetentionPage.more",
          )
        }}
      </p>
      <p v-if="!state.page.rows.length" data-retention-empty>
        {{ t("RetentionPage.empty") }}
      </p>
      <article
        v-for="row in state.page.rows"
        :key="retentionRowKey(state.family, row)"
        class="min-w-0 rounded border p-3"
        data-retention-row
      >
        <dl class="grid min-w-0 gap-2">
          <div
            v-for="field in retentionFields(state.family)"
            :key="field"
            class="min-w-0"
          >
            <dt class="font-medium">
              {{ t(`RetentionPage.fields.${field}`) }}
            </dt>
            <dd>
              <pre
                v-if="raw(field) && row[field] !== null"
                class="whitespace-pre-wrap break-all"
                data-retention-raw
                >{{ row[field] }}</pre
              >
              <span v-else class="whitespace-pre-wrap break-all">{{
                valueText(row[field])
              }}</span>
            </dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>
