<!--
✅ Responsive UI
✅ Page Title
✅ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

✅ Handle loading if data already exists
✅ Handle loading if data is empty
✅ Display data
✅ Handle empty state

✅ Preset Form
✅ Api implemented
✅ Form Client Side Error Handling
✅ Form Submission Process
✅ Form Post Api Error  Handling + ✅ Translation
✅ Form Post Api Success Handling + ✅ Translation
-->

<!--
	The cancellation and withdrawal declarations handed in through the public
	forms of the website. An extraordinary cancellation is deliberately answered
	without an end date - it is examined, and the end date is confirmed to the
	declarant separately in Textform. This page is where that answer is recorded,
	so that the promise made on the confirmation has a surface behind it.
-->
<template>
	<main>
		<div ref="scrollRef"></div>
		<PageTitle />

		<p class="text-body-2 mb-card mt-2">{{ t('Body.DeclarationsIntro') }}</p>

		<div class="flex items-end justify-between gap-card mb-card-sm flex-wrap">
			<InputSelect
				id="declaration-kind"
				label="Headings.DeclarationKind"
				:options="kindOptions"
				v-model="kind"
				@update:model-value="changePage(1)"
			/>

			<p class="text-accent text-sm">
				{{ t('Headings.Result', { n: total }, total) }}
			</p>
		</div>

		<DeclarationsTable
			:data="declarations"
			:loading="loading"
			@process="openProcessing"
		/>

		<Pagination
			:current="currentPage"
			:total-results="total"
			:perPage="limit"
			@change="changePage"
			@change-per-page="changePerPage"
		/>

		<ScrollToBtn :scrollRef="scrollRef" />

		<Modal v-if="processing" @backdrop="processing = null">
			<article
				class="style-card bg-secondary w-full max-w-3xl max-h-[85vh] overflow-y-auto"
			>
				<form class="card grid gap-card" @submit.prevent="submitProcessing()">
					<h2 class="text-heading-2 text-heading font-heading">
						{{ t('Headings.MarkDeclarationProcessed') }}
					</h2>

					<p class="text-body-2">
						{{ t('Body.MarkDeclarationProcessedHint') }}
					</p>

					<dl class="grid gap-2 break-words">
						<dt>{{ t('Headings.DeclarationReference') }}</dt>
						<dd>{{ processing.id }}</dd>
						<dt>{{ t('Headings.DeclarationReceivedAt') }}</dt>
						<dd>{{ dateTime(processing.received_at) }}</dd>
						<dt>{{ t('Headings.DeclarationDeclarant') }}</dt>
						<dd>{{ processing.name }} / {{ processing.email }}</dd>
						<dt>{{ t('Headings.DeclarationContract') }}</dt>
						<dd>
							{{ processing.kind }} / {{ processing.cancellation_type }} /
							{{ processing.contract }} / {{ processing.contract_designation }}
						</dd>
						<dt>{{ t('Headings.DeclarationDetails') }}</dt>
						<dd class="whitespace-pre-wrap">{{ processing.details || '—' }}</dd>
						<dt>{{ t('Headings.DeclarationRequestedEnd') }}</dt>
						<dd>
							{{ dateTime(processing.requested_end) || t('Body.EarliestEnd') }}
						</dd>
						<dt>{{ t('Headings.DeclarationCandidate') }}</dt>
						<dd>{{ processing.user_id || '—' }}</dd>
					</dl>
					<p class="text-error">{{ t('Body.ImmediateReview') }}</p>
					<InputSelect
						id="declaration-action"
						label="Headings.DeclarationAction"
						:options="actionOptions"
						v-model="form.action"
					/>
					<p>{{ t('Body.DeclarationActionHint') }}</p>
					<Input
						v-if="form.action === 'SCHEDULE_PREMIUM_CANCELLATION'"
						id="declaration-user-id"
						label="Headings.DeclarationVerifiedUser"
						v-model="form.userId"
					/>
					<Input
						v-if="form.action === 'SCHEDULE_PREMIUM_CANCELLATION'"
						id="declaration-agreement-id"
						label="Headings.DeclarationAgreement"
						v-model="form.agreementId"
					/>
					<details>
						<summary>{{ t('Headings.DeclarationEvidence') }}</summary>
						<pre class="whitespace-pre-wrap break-all text-sm">{{
							evidenceText
						}}</pre>
					</details>
					<label
						><input type="checkbox" v-model="form.verified" />
						{{ t('Body.DeclarationVerified') }}</label
					>
					<Input
						v-if="form.action === 'RECORD_EXTERNAL_RESOLUTION'"
						id="declaration-effective-end"
						type="text"
						placeholder="2026-12-31T23:59:59+01:00"
						label="Headings.DeclarationEffectiveEnd"
						hint="Body.DeclarationEffectiveEndHint"
						v-model="form.effectiveEnd"
					/>

					<InputTextarea
						id="declaration-note"
						label="Headings.DeclarationNote"
						v-model="form.note"
						:max="4096"
						:rows="4"
					/>

					<div class="flex gap-card justify-end">
						<Btn secondary @click="processing = null">
							{{ t('Buttons.Cancel') }}
						</Btn>
						<InputBtn :loading="submitting" @click="submitProcessing()">
							{{ t('Buttons.MarkDeclarationProcessed') }}
						</InputBtn>
					</div>
				</form>
			</article>
		</Modal>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

export default {
  head: {
    title: 'Declarations',
  },
  setup() {
    const { t, locale } = useI18n();
    const dateTime = (value: string) =>
      formatDeclarationDateTime(value, locale.value);

    const scrollRef = ref<HTMLElement | undefined>(undefined);

    const declarations = useDeclarations();
    const total = useTotalDeclarations();

    const loading = ref(true);
    const currentPage = ref(1);
    const limit = ref(10);
    const kind = ref('');

    const kindOptions = [
      { label: 'Headings.DeclarationKindAll', value: '' },
      { label: 'Headings.DeclarationCancellation', value: 'CANCELLATION' },
      { label: 'Headings.DeclarationWithdrawal', value: 'WITHDRAWAL' },
    ];

    async function load() {
      loading.value = true;

      const [, error] = await getDeclarations({
        kind: kind.value,
        limit: limit.value,
        offset: (currentPage.value - 1) * limit.value,
      });

      loading.value = false;

      if (error) openSnackbar('error', error?.detail ?? 'Error.SomethingWrong');
    }

    onMounted(load);

    function changePage(page: number) {
      currentPage.value = page;
      load();
    }

    function changePerPage(pageSize: number) {
      limit.value = pageSize;
      changePage(1);
    }

    // ============================================================= processing
    const processing = ref<any>(null);
    const submitting = ref(false);
    const form = reactive({
      effectiveEnd: '',
      note: '',
      action: 'RECORD_EXTERNAL_RESOLUTION',
      userId: '',
      agreementId: '',
      verified: false,
    });
    const actionOptions = [
      {
        label: 'Headings.RecordExternalResolution',
        value: 'RECORD_EXTERNAL_RESOLUTION',
      },
      {
        label: 'Headings.SchedulePremiumCancellation',
        value: 'SCHEDULE_PREMIUM_CANCELLATION',
      },
    ];
    const evidenceText = computed(() => {
      try {
        return JSON.stringify(
          JSON.parse(processing.value?.operational_evidence || '{}'),
          null,
          2,
        );
      } catch {
        return '';
      }
    });

    function openProcessing(declaration: any) {
      processing.value = declaration;
      // The stored end date is offered again so that confirming a declaration
      // that already has one does not require typing it a second time.
      form.effectiveEnd = declaration?.effective_end ?? '';
      form.note = '';
      form.action = 'RECORD_EXTERNAL_RESOLUTION';
      form.verified = false;
      form.userId = declaration.user_id || '';
      try {
        form.agreementId =
					JSON.parse(declaration.operational_evidence || '{}')
					  .account_observation?.agreement_id || '';
      } catch {
        form.agreementId = '';
      }
    }

    async function submitProcessing() {
      if (submitting.value || !processing.value?.id) return;

      if (!form.verified || !form.note.trim())
        return openSnackbar('error', 'Error.DeclarationVerificationRequired');
      submitting.value = true;

      const [, error] = await setDeclarationProcessed(processing.value.id, {
        action: form.action,
        identity_verified: form.verified,
        verified_user_id: form.userId || null,
        renewal_agreement_id: form.agreementId || null,
        effective_end:
					form.action === 'RECORD_EXTERNAL_RESOLUTION'
					  ? toEffectiveEnd(form.effectiveEnd)
					  : null,
        note: form.note.trim() || null,
      });

      submitting.value = false;

      if (error) {
        return openSnackbar('error', error?.detail ?? 'Error.SomethingWrong');
      }

      processing.value = null;
      openSnackbar('success', 'Success.DeclarationProcessed');
    }

    return {
      t,
      dateTime,
      actionOptions,
      evidenceText,
      scrollRef,
      declarations,
      total,
      loading,
      currentPage,
      limit,
      kind,
      kindOptions,
      changePage,
      changePerPage,
      processing,
      submitting,
      form,
      openProcessing,
      submitProcessing,
    };
  },
};
</script>
