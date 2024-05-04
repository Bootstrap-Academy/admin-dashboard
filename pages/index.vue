<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Recaptcha
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main class="overflow-hidden">
		<SvgHero />

		<header
			class="container-fluid bg-secondary flex gap-4 items-center h-[50px]"
		>
			<img src="/images/logo.png" class="w-6 h-auto object-contain" alt="" />
			<h1 class="text-heading-3">{{ t('Headings.Website') }}</h1>
		</header>

		<section
			class="container-fluid pt-container pb-container grid place-items-center h-full"
		>
			<article class="container-form bg-primary">
				<SectionTitle
					subheading="Subheadings.LoginForm"
					heading="Headings.LoginForm"
					class="mb-card"
				/>
				<FormLogin />
			</article>
		</section>
	</main>
</template>

<script>
import { useI18n } from 'vue-i18n';

definePageMeta({
  layout: 'empty',
});

export default {
  head: {
    title: 'Admin Login',
  },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>

<style scoped>
main {
	--bar-language-height: 40px;
	height: calc(100vh - var(--bar-language-height));
	max-height: calc(100vh - var(--bar-language-height));
}
</style>
