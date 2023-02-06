<template>
	<Table :data="data" :loading="isLoading" :headers="headers">
		<template #remote="{ item }">
			<CheckIcon v-if="item.remote" class="icon text-success" />
			<XMarkIcon v-else class="icon text-error" />
		</template>

		<template #salary="{ item }">
			<!-- <p>
				{{
					`${abbreviateNumber(item?.salary?.min ?? 0)} - ${abbreviateNumber(
						item?.salary?.max ?? 0
					)} ${(item?.salary?.per ?? '') != 'once' ? '/' : ''} ${
						item?.salary?.per ?? ''
					}`
				}}
			</p> -->
			<p class="text-center">
				{{
					`${abbreviateNumber(item?.salary?.min ?? 0)} - ${abbreviateNumber(
						item?.salary?.max ?? 0
					)}`
				}}
			</p>
		</template>

		<template #occurrence="{ item }">
			<p class="text-center">
				{{ item?.salary?.per ?? 'once' }}
			</p>
		</template>

		<template #unit="{ item }">
			<Chip
				:color="
					(item?.salary?.unit ?? 'EUR') == 'EUR'
						? 'chip-color-2'
						: 'chip-color-1'
				"
				class="w-fit md:mx-auto"
			>
				{{ (item?.salary?.unit ?? 'EUR') == 'EUR' ? 'Morphcoins' : 'Euros' }}
			</Chip>
		</template>

		<template #professional_level="{ item }">
			<p class="text-center">
				{{ item?.professional_level ?? '' }}
			</p>
		</template>

		<template #actions="{ item }">
			<div class="flex gap-3">
				<Icon
					@click="onclickDeleteItem(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="TrashIcon"
				/>
				<Icon
					@click="onclickEditItem(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="PencilIcon"
				/>
				<Icon
					@click="onclickViewItem(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="EyeIcon"
				/>
			</div>
		</template>
	</Table>
</template>

<script lang="ts">
import { Ref, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

import {
	CheckCircleIcon,
	XCircleIcon,
	XMarkIcon,
	CheckIcon,
	TrashIcon,
	PencilIcon,
	EyeIcon,
} from '@heroicons/vue/24/outline/index.js';

export default {
	props: {
		data: { type: Array as PropType<any[]>, default: [] },
		loading: { type: Boolean, default: true },
	},
	components: {
		CheckCircleIcon,
		XCircleIcon,
		XMarkIcon,
		CheckIcon,
		TrashIcon,
		PencilIcon,
		EyeIcon,
	},
	setup(props) {
		const { t } = useI18n();

		const isLoading = computed(() => {
			return props.loading && props.data.length <= 0;
		});

		const headers = computed(() => {
			let arrHeaders = [
				{
					label: 'Title',
					key: 'title',
				},
				{
					label: 'Remote',
					key: 'remote',
				},
				{
					label: 'Type',
					key: 'type',
				},
				{
					label: 'Salary Amount',
					key: 'salary',
				},
				{
					label: 'Salary Occurrence',
					key: 'occurrence',
					class: 'text-center',
				},
				{
					label: 'Salary Unit',
					key: 'unit',
				},
				{
					label: 'Professional Level',
					key: 'professional_level',
					class: 'text-center',
				},
				// {
				// 	label: 'Location',
				// 	key: 'location',
				// },
				{
					label: 'Headings.Actions',
					key: 'actions',
					class: 'text-center',
				},
			];

			return arrHeaders;
		});

		async function onclickDeleteItem(item: any) {
			openDialog(
				'warning',
				'Delete Job',
				'Are you sure you want to delete job? This action cannot be undone.',
				false,
				{
					label: 'Yes, Delete Job',
					onclick: async () => {
						setLoading(true);
						const [success, error] = await deleteJob(item.id);
						setLoading(false);

						success
							? openSnackbar(
									'success',
									`Delete ${item?.title ?? 'this'} job successfully`
							  )
							: openSnackbar('error', error?.detail ?? '');
					},
				},
				{
					label: 'Buttons.Cancel',
					onclick: () => {},
				}
			);
		}

		const router = useRouter();
		const job = useJob();

		function onclickViewItem(item: any) {
			if (!!!item || !!!item.id) return;

			job.value = item;
			router.push(`/dashboard/jobs/${item.id}`);
		}

		function onclickEditItem(item: any) {
			if (!!!item || !!!item.id) return;

			job.value = item;
			router.push(`/dashboard/jobs/${item.id}/edit`);
		}

		return {
			isLoading,
			headers,
			XMarkIcon,
			TrashIcon,
			PencilIcon,
			EyeIcon,
			onclickDeleteItem,
			onclickViewItem,
			onclickEditItem,
		};
	},
};
</script>

<style scoped>
.icon {
	@apply h-5 w-5 md:mx-auto;
}
</style>
