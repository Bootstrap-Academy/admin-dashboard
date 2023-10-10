<template>
	<Table
		:data="data"
		:loading="isLoading"
		:headers="headers"
		@isMobile="isMobile = $event"
	>
		<template #icon="{ item }">
			<img
				:src="`/svgs/${item.icon}.svg`"
				alt=""
				class="h-5 w-5 md:h-10 md:w-10 xl:h-14 xl:w-14 object-contain rounded-full"
			/>
		</template>

		<template #dependencies="{ item }">
			<p class="text-center" :title="item?.dependencies ?? ''">
				{{ (item?.dependencies ?? []).length }}
			</p>
		</template>

		<template #dependents="{ item }">
			<p class="text-center" :title="item?.dependents ?? ''">
				{{ (item?.dependents ?? []).length }}
			</p>
		</template>

		<template #skills="{ item }">
			<p class="text-center" :title="item?.skills ?? ''">
				{{ (item?.skills ?? []).length }}
			</p>
		</template>

		<template #actions="{ item }">
			<div class="flex gap-3">
				<Btn sm @click="onclickManageItem(item)" class="mr-4">Manage</Btn>

				<!-- <Icon
					@click="onclickEditItem(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="PencilIcon"
				/> -->
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
	XMarkIcon,
	CheckIcon,
	EyeIcon,
	PencilIcon,
} from '@heroicons/vue/24/outline/index.js';

export default {
	props: {
		data: { type: Array as PropType<any[]>, default: [] },
		loading: { type: Boolean, default: true },
	},
	components: {
		CheckCircleIcon,
		PencilIcon,
		XMarkIcon,
		CheckIcon,
		EyeIcon,
	},
	setup(props) {
		const { t } = useI18n();

		const isLoading = computed(() => {
			return props.loading && props.data.length <= 0;
		});

		const isMobile = ref(false);

		const headers = computed(() => {
			return [
				{
					label: 'Icon',
					key: 'icon',
				},
				{
					label: 'Name',
					key: 'name',
				},
				{
					label: '# of Dependencies',
					key: 'dependencies',
				},
				{
					label: '# of Dependents',
					key: 'dependents',
				},
				{
					label: '# of Skills',
					key: 'skills',
				},
				{
					label: 'Headings.Actions',
					key: 'actions',
					class: 'text-center',
				},
			];
		});

		const router = useRouter();
		const rootSkill = useRootSkill();

		function onclickManageItem(item: any) {
			if (Boolean(!item) || Boolean(!item.id)) return;
			rootSkill.value = item;

			router.push(`/dashboard/skill-tree/${item.id}/manage`);
		}

		function onclickEditItem(item: any) {
			if (Boolean(!item) || Boolean(!item.id)) return;
			rootSkill.value = item;

			router.push(`/dashboard/skill-tree/${item.id}/edit`);
		}

		function onclickViewItem(item: any) {
			if (Boolean(!item) || Boolean(!item.id)) return;
			rootSkill.value = item;

			router.push(`/dashboard/skill-tree/${item.id}/sub-skills`);
		}

		return {
			isLoading,
			isMobile,
			headers,
			XMarkIcon,
			EyeIcon,
			PencilIcon,
			onclickManageItem,
			onclickEditItem,
			onclickViewItem,
		};
	},
};
</script>

<style scoped>
.icon {
	@apply h-5 w-5 md:mx-auto;
}
</style>
