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
			<Title>Edit Root Skill - {{ rootSkillName }}</Title>
		</Head>

		<article class="container-form bg-primary max-w-none">
			<h1 class="text-heading-2 text-center mb-card">
				Edit {{ rootSkillName }}
			</h1>
			<FormRootSkill :data="rootSkill" :loading="loading" />
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
		title: 'Edit Root Skill - ',
	},
	setup() {
		const route = useRoute();

		const rootSkillID = computed(() => {
			return <string>(route?.params?.id ?? '');
		});

		const rootSkillName = computed(() => {
			return rootSkillID.value.replace(/_/g, ' ');
		});

		const loading = ref(true);
		const rootSkill: Ref<any> = useRootSkill();

		onMounted(async () => {
			loading.value = true;
			await getRootSkill(rootSkillID.value);
			loading.value = false;
		});

		return { rootSkillID, rootSkillName, loading, rootSkill };
	},
};
</script>
