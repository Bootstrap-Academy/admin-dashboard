<template>
	<Table
		:data="data"
		:loading="isLoading"
		:headers="headers"
		@isMobile="isMobile = $event"
	>
		<template #display_name="{ item }">
			<div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
				<img
					:src="item.avatar_url"
					alt=""
					class="h-5 w-5 md:h-10 md:w-10 object-contain rounded-full"
				/>
				<div>
					<p class="clamp line-1 text-body-2">
						{{ item.display_name }}
					</p>
					<p class="hidden md:clamp line-1 text-body-1">
						{{ item.email }}
					</p>
				</div>
			</div>
		</template>

		<template #admin="{ item }">
			<Chip
				:color="item.admin ? 'chip-color-2' : 'chip-color-1'"
				class="w-fit md:mx-auto"
			>
				{{ item.admin ? 'Admin' : 'User' }}
			</Chip>
		</template>

		<template #mfa_enabled="{ item }">
			<CheckIcon v-if="item.mfa_enabled" class="icon text-success" />
			<XMarkIcon v-else class="icon text-error" />
		</template>

		<template #email_verified="{ item }">
			<CheckIcon v-if="item.email_verified" class="icon text-success" />
			<XMarkIcon v-else class="icon text-error" />
		</template>

		<template #newsletter="{ item }">
			<CheckIcon v-if="item.newsletter" class="icon text-success" />
			<XMarkIcon v-else class="icon text-error" />
		</template>

		<template #enabled="{ item }">
			<CheckIcon v-if="item.enabled" class="icon text-success" />
			<XMarkIcon v-else class="icon text-error" />
		</template>

		<template #balance="{ item }">
			<p>{{ abbreviateNumber(item.balance) }}</p>
		</template>

		<template #xp="{ item }">
			<p>{{ abbreviateNumber(item.xp) }}</p>
		</template>

		<template #actions="{ item }">
			<div class="flex gap-3">
				<Icon
					@click="onclickDeleteUser(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="TrashIcon"
				/>
				<Icon
					@click="onclickBanUser(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="NoSymbolIcon"
				/>
				<Icon
					@click="onclickViewUser(item)"
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
	NoSymbolIcon,
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
		NoSymbolIcon,
		EyeIcon,
	},
	setup(props) {
		const { t } = useI18n();

		const isLoading = computed(() => {
			return props.loading && props.data.length <= 0;
		});

		const isMobile = ref(false);

		const headers = computed(() => {
			let arrHeaders = [
				{
					label: 'Headings.User',
					key: 'display_name',
				},
				{
					label: 'Headings.Nickname',
					key: 'name',
				},
				{
					label: 'Headings.Email',
					key: 'email',
				},
				{
					label: 'Headings.Role',
					key: 'admin',
					class: 'text-center',
				},
				{
					label: 'Headings.Verified',
					key: 'email_verified',
				},
				{
					label: 'Headings.MFA',
					key: 'mfa_enabled',
				},
				{
					label: 'Headings.Newsletter',
					key: 'newsletter',
				},
				{
					label: 'Headings.Enabled',
					key: 'enabled',
				},
				{
					label: 'Headings.Balance',
					key: 'balance',
				},
				{
					label: 'Headings.XP',
					key: 'xp',
				},
				{
					label: 'Headings.Actions',
					key: 'actions',
					class: 'text-center',
				},
			];

			if (isMobile.value == true) {
				return arrHeaders;
			} else {
				arrHeaders.splice(2, 1);
				return arrHeaders;
			}
		});

		async function onclickDeleteUser(user: any) {
			openDialog(
				'warning',
				'Headings.DeleteUser',
				'Body.DeleteUser',
				false,
				{
					label: 'Buttons.DeleteUser',
					onclick: async () => {
						setLoading(true);
						const [success, error] = await deleteAppUser(user.id);
						setLoading(false);

						success
							? openSnackbar(
									'success',
									t('Success.DeleteUser', { placeholder: user?.name ?? 'User' })
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

		async function onclickBanUser(user: any) {
			let status = !user.enabled;

			setLoading(true);
			const [success, error] = await setBanStatusOfAppUser(status, user.id);
			setLoading(false);

			success
				? openSnackbar(
						'success',
						status
							? t('Success.EnableUser', { placeholder: user?.name ?? 'User' })
							: t('Success.BanUser', { placeholder: user?.name ?? 'User' })
				  )
				: openSnackbar('error', error?.detail ?? '');
		}

		const router = useRouter();
		const appUser = useAppUser();
		function onclickViewUser(user: any) {
			if (!!!user || !!!user.id) return;

			appUser.value = user;
			router.push(`/dashboard/users/${user.id}`);
		}
		return {
			isLoading,
			isMobile,
			headers,
			XMarkIcon,
			TrashIcon,
			NoSymbolIcon,
			EyeIcon,
			onclickDeleteUser,
			onclickBanUser,
			onclickViewUser,
		};
	},
};
</script>

<style scoped>
.icon {
	@apply h-5 w-5 md:mx-auto;
}
</style>
