<template>
	<Table :data="data" :loading="loading" :headers="headers">
		<template #received_at="{ item }">
			<p class="text-body-2">{{ dateTime(item?.received_at) }}</p>
		</template>

		<template #kind="{ item }">
			<Chip class="w-fit">{{ t(kindLabel(item)) }}</Chip>
		</template>

		<template #declarant="{ item }">
			<div class="max-w-[280px]">
				<p class="text-body-2">{{ item?.name ?? '' }}</p>
				<p class="text-body-2 text-subheading">{{ item?.email ?? '' }}</p>
			</div>
		</template>

		<template #contract="{ item }">
			<div class="max-w-[280px]">
				<p class="text-body-2">{{ t(contractLabel(item)) }}</p>
				<p v-if="item?.contract_designation" class="text-body-2 text-subheading">
					{{ item.contract_designation }}
				</p>
			</div>
		</template>

		<template #effective_end="{ item }">
			<p class="text-body-2">
				{{ date(item?.effective_end) || t('Headings.DeclarationEndOpen') }}
			</p>
		</template>

		<!--
			Whether a declaration has been dealt with, and what was noted when it
			was. An extraordinary cancellation gets no end date from the backend,
			so this is where the date confirmed to the declarant is recorded.
		-->
		<template #processed_at="{ item }">
			<div class="max-w-[280px]">
				<p class="text-body-2">
					{{ dateTime(item?.processed_at) || t('Headings.DeclarationOpen') }}
				</p>
				<p v-if="item?.processing_note" class="text-body-2 text-subheading">
					{{ item.processing_note }}
				</p>
			</div>
		</template>

		<template #actions="{ item }">
			<div class="flex justify-center">
				<Btn sm secondary @click="emit('process', item)">
					{{ t('Buttons.MarkDeclarationProcessed') }}
				</Btn>
			</div>
		</template>
	</Table>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

const KIND_LABELS: Record<string, string> = {
  CANCELLATION: 'Headings.DeclarationCancellation',
  WITHDRAWAL: 'Headings.DeclarationWithdrawal',
};

const CONTRACT_LABELS: Record<string, string> = {
  PREMIUM: 'Headings.ContractPremium',
  COINS: 'Headings.ContractCoins',
  OTHER: 'Headings.ContractOther',
};

const CANCELLATION_TYPE_LABELS: Record<string, string> = {
  ORDINARY: 'Headings.OrdinaryCancellation',
  EXTRAORDINARY: 'Headings.ExtraordinaryCancellation',
};

export default defineComponent({
  props: {
    data: { type: Array as PropType<any[]>, default: () => [] },
    loading: { type: Boolean, default: true },
  },
  emits: ['process'],
  setup(props, { emit }) {
    const { t, locale } = useI18n();

    const headers = [
      { label: 'Headings.DeclarationReceivedAt', key: 'received_at' },
      { label: 'Headings.DeclarationKind', key: 'kind' },
      { label: 'Headings.DeclarationDeclarant', key: 'declarant' },
      { label: 'Headings.DeclarationContract', key: 'contract' },
      { label: 'Headings.DeclarationEffectiveEnd', key: 'effective_end' },
      { label: 'Headings.DeclarationProcessed', key: 'processed_at' },
      { label: 'Headings.Actions', key: 'actions', class: 'text-center' },
    ];

    const dateTime = (value: string) =>
      formatDeclarationDateTime(value ?? '', locale.value);
    const date = (value: string) =>
      formatDeclarationDate(value ?? '', locale.value);

    // A cancellation is shown as ordinary or extraordinary, because that is
    // what decides whether an end date can be determined at all.
    function kindLabel(item: any) {
      if (item?.kind == 'CANCELLATION' && item?.cancellation_type) {
        return (
          CANCELLATION_TYPE_LABELS[item.cancellation_type] ??
					KIND_LABELS.CANCELLATION
        );
      }

      return KIND_LABELS[item?.kind] ?? 'Headings.DeclarationCancellation';
    }

    function contractLabel(item: any) {
      return CONTRACT_LABELS[item?.contract] ?? 'Headings.ContractOther';
    }

    return { t, headers, dateTime, date, kindLabel, contractLabel, emit };
  },
});
</script>

<style scoped></style>
