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
			<Title>Edit Company - {{ company?.title ?? '' }}</Title>
		</Head>

		<article class="container-form bg-primary max-w-none">
			<h1 class="text-heading-2 text-center mb-card">Edit Company</h1>
			<FormCompany :data="company" />
		</article>
	</main>
</template>

<script lang="ts">
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Company Details - ',
	},
	setup() {
		const { t } = useI18n();

		const route = useRoute();

		const id = computed(() => {
			return <string>(route?.params?.id ?? '');
		});

		const loading = ref(true);
		const company: Ref<any> = useCompany();

		onMounted(async () => {
			await getCompany(id.value);
			loading.value = false;
		});

		return { t, id, loading, company };
	},
};
</script>
