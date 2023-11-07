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
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main
		class="container pt-container pb-container grid place-items-center h-screen-inner min"
	>
		<Head>
			<Title>Edit Job - {{ job?.title ?? '' }}</Title>
		</Head>

		<article class="container-form bg-primary max-w-none">
			<h1 class="text-heading-2 text-center mb-card">Edit Job</h1>
			<FormJob :data="job" :loading="loading" :companiesList="companiesList" />
		</article>
	</main>
</template>

<script lang="ts">
import type { Ref } from 'vue';
definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Edit Job',
	},
	setup() {
		const route = useRoute();

		const id = computed(() => {
			return <string>(route?.params?.id ?? '');
		});

		const loading = ref(true);
		const job: Ref<any> = useJob();

		const companies: Ref<any[]> = useCompanies();

		onMounted(async () => {
			loading.value = true;
			await Promise.all([getJob(id.value), getCompanies([])]);
			loading.value = false;
		});

		const companiesList = computed(() => {
			return companies.value.map((company) => {
				return {
					value: company.id,
					label: company.name,
				};
			});
		});

		return { id, loading, job, companiesList };
	},
};
</script>
