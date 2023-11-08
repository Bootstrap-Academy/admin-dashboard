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
			placeholder="Search by title"
			:modelValue="filters.search_term"
			@update:modelValue="value => filters.search_term = value"
			@search="setFilters({ search_term: filters.search_term })"
			:loading="loading"
		/>

		<div class="flex gap-card items-center mb-card">
			<Sort
				class="w-full"
				text="Sort By"
				:options="sortOptions"
				:quantity="jobs.length"
				@selected="onselectSortJobsBy($event)"
			/>

			<NuxtLink to="/dashboard/jobs/create" class="flex-shrink-0 w-fit">
				<Btn :icon="PlusIcon">New Job</Btn>
			</NuxtLink>
		</div>
		<JobsTable :data="jobs" :loading="loading" />

		<ScrollToBtn :scrollRef="scrollRef" />
	</main>
</template>

<script lang="ts">
import type { Ref } from 'vue';

import { PlusIcon } from '@heroicons/vue/24/outline/index.js';

definePageMeta({
	middleware: ['auth'],
	layout: 'dashboard',
});

export default {
	head: {
		title: 'Jobs',
	},
	components: { PlusIcon },
	setup() {
		const scrollRef = ref<HTMLElement | null>(null);

		const jobs: Ref<any[]> = useJobs();

		const loading = ref(!(jobs.value && jobs.value.length > 0));

		const cookie_filters = <any>useCookie('job_filter');
		const filters = reactive(
			cookie_filters.value ?? {
				// type: [],
				// remote: false,
				search_term: '',
				// requirements_met: false,
				// professional_level: [],
				// salary_min: 0,
				// salary_unit: '---',
			}
		);

		async function setFilters(paramFilters: any) {
			Object.assign(filters, {
				...filters,
				...paramFilters,
			});

			cookie_filters.value = JSON.stringify(filters);

			loading.value = true;
			await getJobs(filters);
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

		function onselectSortJobsBy(option: string) {
			if (Boolean(!jobs.value) || jobs.value.length <= 0) return;

			if (option == 'latest') {
				jobs.value.sort(function (x, y) {
					return x.last_update - y.last_update;
				});
			} else if (option == 'oldest') {
				jobs.value.sort(function (x, y) {
					return y.last_update - x.last_update;
				});
			}
		}

		return {
			PlusIcon,
			loading,
			jobs,
			setFilters,
			filters,
			sortOptions,
			scrollRef,
			onselectSortJobsBy,
		};
	},
};
</script>
