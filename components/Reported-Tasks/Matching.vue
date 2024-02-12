<template>
	<div class="flex flex-col justify-center text-center gap-3">
		<h2 class="text-accent text-3xl">{{ t("Headings.MatchingSolution") }}</h2>
		<div class="flex justify-evenly">
			<div class="text-center">
				<h3>{{ t('Body.LeftMatchingSide') }}</h3>
				<p v-for="(item, index) in reportedMatching.left" :key="index">
					{{ item }}
				</p>
			</div>
			<div class="text-center">
				<h3>{{t('Body.RightMatchingSide')}}</h3>
				<p v-for="(solution, index) in reportedMatching.solution">
					{{ reportedMatching.right[solution] }}
				</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const reportedMatching = useMatching();

const { t } = useI18n();
</script>

<style scoped></style>
