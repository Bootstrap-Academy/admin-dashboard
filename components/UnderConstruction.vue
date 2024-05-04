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
		<article class="w-full h-full flex flex-col items-center justify-center">
			<SvgUnderConstruction class="max-w-[400px]" />
			<h2 class="text-heading-2 mt-card text-center">Page Under Progress</h2>
			<p class="text-body-1 text-center mt-2">
				We are working on it. Please try again later.
			</p>
		</article>
	</main>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  setup() {
    const { t } = useI18n();

    return { t };
  },
});
</script>

<style scoped>
article {
	--language-bar-height: 33px;
	--page-title-height: 45px;
	--dashboard-padding: 50px;
	--total: calc(
		var(--language-bar-height) + var(--page-title-height) +
			var(--dashboard-padding) + var(--dashboard-padding)
	);
	min-height: calc(100vh - var(--total));
}

@media screen and (min-width: 525px) {
	article {
		--dashboard-padding: 50px;
	}
}
@media screen and (min-width: 768px) {
	article {
		--dashboard-padding: 60px;
	}
}
@media screen and (min-width: 1024px) {
	article {
		--dashboard-padding: 40px;
	}
}
</style>
