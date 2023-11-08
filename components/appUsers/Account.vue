<template>
	<section class="card style-card bg-secondary stats">
		<h2 class="text-heading-2 mb-card">Account Information</h2>

		<article>
			<h3>{{ isMFA.label }}</h3>
			<CheckCircleIcon v-if="isMFA.value" class="icon text-success" />
			<XCircleIcon v-else class="icon text-error" />
		</article>

		<hr />

		<article>
			<h3>{{ verified.label }}</h3>
			<CheckCircleIcon v-if="verified.value" class="icon text-success" />
			<XCircleIcon v-else class="icon text-error" />
		</article>

		<hr />

		<article>
			<h3>{{ newsletter.label }}</h3>
			<CheckCircleIcon v-if="newsletter.value" class="icon text-success" />
			<XCircleIcon v-else class="icon text-error" />
		</article>

		<hr />

		<article>
			<h3>
				{{ enabled.label }}
				<PencilSquareIcon class="pencil-icon" @click="enabled.onclick()" />
			</h3>
			<CheckCircleIcon v-if="enabled.value" class="icon text-success" />
			<XCircleIcon v-else class="icon text-error" />
		</article>

		<hr />

		<article>
			<h3>{{ role.label }}</h3>
			<Chip :color="role.value ? 'chip-color-2' : 'chip-color-1'" class="w-fit">
				{{ role.value ? 'Admin' : 'User' }}
			</Chip>
		</article>

		<hr />

		<article>
			<h3>
				{{ coins.label }}
				<PencilSquareIcon class="pencil-icon" @click="coins.onclick()" />
			</h3>
			<p :title="coins.value">{{ abbreviateNumber(coins.value) }}</p>
		</article>

		<hr />

		<article>
			<h3>{{ registration.label }}</h3>
			<p>{{ registration.value }}</p>
		</article>

		<hr />

		<article>
			<h3>{{ last_login.label }}</h3>
			<p>{{ last_login.value }}</p>
		</article>

		<Modal v-if="coinsDialog" @backdrop="coinsDialog = false">
			<FormCoins
				:id="data?.id ?? ''"
				:name="data?.name ?? ''"
				:coins="coins.value"
				@coins="totalCoins = $event"
				@isSuccess="coinsDialog = false"
			/>
		</Modal>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	CheckCircleIcon,
	XCircleIcon,
	PencilSquareIcon,
} from '@heroicons/vue/24/outline/index.js';

export default defineComponent({
	components: {
		CheckCircleIcon,
		XCircleIcon,
		PencilSquareIcon,
	},
	props: { data: { type: Object as PropType<any>, default: null } },
	setup(props) {
		const { t } = useI18n();

		const id = computed(() => {
			return props?.data?.id ?? '';
		});

		const enabled = computed(() => {
			return {
				label: 'Enabled',
				value: props.data?.enabled ?? false,
				onclick: async () => {
					let status = !enabled.value.value;
					let userID = props.data?.id ?? '';
					let userName = props.data?.name ?? 'User';

					setLoading(true);
					const [success, error] = await setBanStatusOfAppUser(status, userID);
					setLoading(false);

					success
						? openSnackbar(
								'success',
								status
									? t('Success.EnableUser', {
											placeholder: userName,
									  })
									: t('Success.BanUser', { placeholder: userName })
						  )
						: openSnackbar('error', error?.detail ?? '');
				},
			};
		});

		const coinsDialog = ref(false);
		const totalCoins = ref(0);
		const coins = computed(() => {
			return {
				label: 'Total Coins',
				value: totalCoins.value,
				onclick: () => {
					coinsDialog.value = true;
				},
			};
		});
		watch(
			() => id.value,
			async (newValue, oldValue) => {
				if (newValue) {
					const [balance, errorBalance] = await getBalanceOfThisUser(newValue);
					totalCoins.value = balance?.coins ?? 0;
				}
			},
			{ immediate: true, deep: true }
		);

		const isMFA = computed(() => {
			return {
				label: 'Is MFA',
				value: props.data?.mfa_enabled ?? false,
			};
		});

		const verified = computed(() => {
			return {
				label: 'Verified',
				value: props.data?.email_verified ?? false,
			};
		});

		const role = computed(() => {
			return {
				label: 'Role',
				value: props.data?.admin ?? false,
			};
		});

		const newsletter = computed(() => {
			return {
				label: 'Newsletter',
				value: props.data?.newsletter ?? false,
			};
		});

		const registration = computed(() => {
			let { date, month, year } = convertTimestampToDate(
				props.data?.registration ?? ''
			);
			return {
				label: 'Registration',
				value: `${date} ${month?.string ?? ''}, ${year}`,
			};
		});

		const last_login = computed(() => {
			let { date, month, year } = convertTimestampToDate(
				props.data?.last_login ?? ''
			);
			return {
				label: 'Last Login',
				value: `${date} ${month?.string ?? ''}, ${year}`,
			};
		});

		return {
			enabled,
			coins,
			isMFA,
			verified,
			role,
			newsletter,
			registration,
			last_login,
			coinsDialog,
			totalCoins,
		};
	},
});
</script>

<style scoped>
.stats > article {
	@apply flex justify-between gap-box;
}
.stats > article > h3 {
	@apply text-heading-4 flex gap-3 items-center text-body;
}
.stats > article > p {
	@apply text-body-1 text-heading;
}
.stats > hr {
	@apply mt-box mb-box;
}
.stats > article h3 .pencil-icon {
	@apply w-5 h-5 text-info cursor-pointer;
}
.icon {
	@apply h-8 w-8;
}
</style>
