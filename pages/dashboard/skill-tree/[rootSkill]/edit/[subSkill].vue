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
	<main>
		<Head>
			<Title>Edit Sub Skill - {{ skillName }}</Title>
		</Head>

		<h1>{{ skillName }} and {{ rootSkillID }}</h1>
		<UnderConstruction />
	</main>
</template>

<script lang="ts">
definePageMeta({
  middleware: ['auth'],
});

export default {
  head: {
    title: 'Edit Sub Skill - ',
  },
  setup() {
    const route = useRoute();

    const rootSkillID = computed(() => {
      return <string>(route?.params?.rootSkill ?? '');
    });

    const subSkillID = computed(() => {
      return <string>(route?.params?.subSkill ?? '');
    });

    const skillName = computed(() => {
      return subSkillID.value.replace(/_/g, ' ');
    });

    return { skillName, rootSkillID };
  },
};
</script>
