<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Recaptcha
❌ Preset Form
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error  Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main>
		<div ref="scrollRef"></div>
		<PageTitle />

		<FormSearch
			enter-only
			class="mb-card-sm mt-card"
			placeholder="Search by Name"
			:modelValue="filters.search_term"
			@update:modelValue="setFilters({ search_term: $event })"
			:loading="loading"
		/>

		<div class="flex gap-card items-center mb-card">
			<Sort
				class="w-full"
				text="Sort By"
				:options="sortOptions"
				:quantity="companies.length"
				@selected="onselectSortCompaniesBy($event)"
			/>

			<NuxtLink to="/dashboard/companies/create" class="flex-shrink-0 w-fit">
				<Btn :icon="PlusIcon">New Company</Btn>
			</NuxtLink>
		</div>
		<CompaniesTable :data="companies" :loading="loading" />

		<ScrollToBtn :scrollRef="scrollRef" />
	</main>
</template>

<script lang="ts">
import { Ref } from 'vue';

import { PlusIcon } from '@heroicons/vue/24/outline/index.js';

definePageMeta({
	middleware: ['auth'],
	layout: 'dashboard',
});

export default {
	head: {
		title: 'Companies',
	},
	components: { PlusIcon },
	setup() {
		const scrollRef = ref<HTMLElement | null>(null);

		const companies: Ref<any[]> = useCompanies();

		const loading = ref(!(companies.value && companies.value.length > 0));

		const cookie_filters = <any>useCookie('company_filter');
		const filters = reactive(
			cookie_filters.value ?? {
				search_term: '',
			}
		);

		async function setFilters(paramFilters: any) {
			Object.assign(filters, {
				...filters,
				...paramFilters,
			});

			cookie_filters.value = JSON.stringify(filters);

			loading.value = true;
			await getCompanies(filters);
			loading.value = false;
		}

		onMounted(async () => {
			await setFilters(filters);
		});

		const sortOptions = [
			{
				label: 'Latest',
				value: 'latest',
			},
			{
				label: 'Oldest',
				value: 'oldest',
			},
		];

		function onselectSortCompaniesBy(option: string) {
			if (Boolean(!companies.value) || companies.value.length <= 0) return;

			if (option == 'latest') {
				companies.value.sort(function (x, y) {
					return x.last_update - y.last_update;
				});
			} else if (option == 'oldest') {
				companies.value.sort(function (x, y) {
					return y.last_update - x.last_update;
				});
			}
		}

		return {
			PlusIcon,
			loading,
			companies,
			setFilters,
			filters,
			sortOptions,
			scrollRef,
			onselectSortCompaniesBy,
		};
	},
};
</script>
