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
		<article class="container-form bg-primary max-w-none">
			<h1 class="text-heading-2 text-center mb-card">Create Job</h1>
			<FormJob :loading="loading" :companiesList="companiesList" />
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
		title: 'Create Job',
	},
	setup() {
		const loading = ref(true);
		const companies: Ref<any[]> = useCompanies();

		onMounted(async () => {
			loading.value = true;
			await getCompanies([]);
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

		return { loading, companiesList };
	},
};
</script>
