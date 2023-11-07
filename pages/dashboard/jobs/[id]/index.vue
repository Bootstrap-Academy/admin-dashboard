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
	<JobsSkeleton v-if="loading" />

	<main
		v-else-if="job"
		class="container-fluid pt-container pb-container grid gap-container items-start grid-cols-1 md:grid-cols-[1fr_250px] xl:grid-cols-[1fr_350px]"
	>
		<Head>
			<Title>Job Details - {{ job?.title ?? '' }}</Title>
		</Head>

		<JobsHeader :data="job" />

		<section>
			<h2 class="mb-box text-heading-3">{{ t('Headings.JobDetails') }}</h2>
			<JobsDetails :data="job" />
		</section>

		<section class="md:sticky md:container-top md:self-start">
			<h2 class="mb-box text-heading-3">{{ t('Headings.JobOverview') }}</h2>
			<JobsOverview :data="job" />
		</section>
	</main>

	<JobsEmptyState v-else />
</template>

<script lang="ts">
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';

definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Manage Job - ',
	},
	setup() {
		const { t } = useI18n();

		const route = useRoute();

		const id = computed(() => {
			return <string>(route?.params?.id ?? '');
		});

		const loading = ref(true);
		const job: Ref<any> = useJob();

		onMounted(async () => {
			await getJob(id.value);
			loading.value = false;
		});

		return { t, id, loading, job };
	},
};
</script>
