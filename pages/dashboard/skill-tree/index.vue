<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari

❌ Recaptcha
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main>
		<div ref="scrollRef"></div>
		<div class="flex flex-wrap justify-between items-end gap-card">
			<PageTitle />
			<NuxtLink to="/dashboard/skill-tree/root/manage">
				<Btn>Manage Root Tree</Btn>
			</NuxtLink>
		</div>

		<FormSearch
			enter-only
			class="mb-card-sm mt-card"
			placeholder="Search By Name"
			:modelValue="filters.email"
			@update:modelValue="setFilters({ email: $event })"
		/>

		<Sort
			text="Headings.FilterBy"
			class="mb-card"
			:options="options"
			:quantity="(rootSkills?.skills ?? []).length"
			@selected="onSelectedOption($event)"
		/>

		<SkillTreeTable :data="rootSkills?.skills ?? []" :loading="loading" />

		<ScrollToBtn :scrollRef="scrollRef" />
	</main>
</template>

<script lang="ts">
import { Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
	middleware: ['auth'],
	layout: 'dashboard',
});

export default {
	head: {
		title: 'Root Skills',
	},
	setup() {
		const { t } = useI18n();

		const scrollRef = ref<HTMLElement | null>(null);

		const rootSkills: Ref<any> = useRootSkills();

		const loading = ref(Boolean(!rootSkills.value));

		const cookie_filters = <any>useCookie('rootSkills_filter');
		const filters = reactive(
			cookie_filters.value ?? {
				email: '',
				enabled: false,
				admin: false,
				mfa_enabled: false,
				email_verified: false,
				newsletter: false,
			}
		);

		// onMounted(async () => {
		// 	await getRootSkills();
		// 	loading.value = false;
		// });

		async function setFilters(paramFilters: any) {
			Object.assign(filters, {
				...filters,
				...paramFilters,
			});

			cookie_filters.value = JSON.stringify(filters);

			loading.value = true;
			await getRootSkills();
			loading.value = false;
		}

		const options = [
			{
				label: 'Headings.None',
				value: 'none',
			},
			{
				label: 'Headings.Enabled',
				value: 'enabled',
			},
			{
				label: 'Headings.Admin',
				value: 'admin',
			},
			{
				label: 'Headings.MFA',
				value: 'mfa_enabled',
			},
			{
				label: 'Headings.Verified',
				value: 'email_verified',
			},
			{
				label: 'Headings.Newsletter',
				value: 'newsletter',
			},
		];

		function onSelectedOption(option: string) {
			setFilters({
				enabled: option == 'enabled',
				admin: option == 'admin',
				mfa_enabled: option == 'mfa_enabled',
				email_verified: option == 'email_verified',
				newsletter: option == 'newsletter',
			});
		}

		return {
			t,
			loading,
			rootSkills,
			scrollRef,
			setFilters,
			options,
			filters,
			onSelectedOption,
		};
	},
};
</script>

<style scoped></style>
