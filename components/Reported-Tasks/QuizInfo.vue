<template>
	<div class="flex flex-col items-center gap-3 py-2">
    <!-- Information: Quiz Question -->
		<div class="w-2/3">
			<p class="text-xl mb-1 text-white">{{ t("Headings.Quiz") }}</p>
			<p>
				<span> {{ t("Headings.Question") }}: </span>{{ mcq?.question ?? "" }}
			</p>
		</div>

    <!-- Information: Quiz Options -->
		<div class="w-2/3">
			<p class="text-xl mb-2 text-white">{{ t("Headings.Options") }}</p>
			<div class="flex flex-col gap-2">
				<p
					:class="answer.correct ? 'bg-success' : 'bg-error'"
					class="flex items-center gap-3 px-5 text-white justify-center rounded-md"
					v-for="(answer, i) of mcq?.answers"
					:key="i"
				>
					<IconCheck v-if="answer?.correct" size="1rem" />
					<IconXMark v-else size="1rem" />

					{{ answer?.answer ?? "" }}
				</p>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
	import type { IconXMark } from "#build/components";
	import { ExclamationCircleIcon } from "@heroicons/vue/24/outline";
	import { useI18n } from "vue-i18n";

	defineProps<{
		mcq: any;
	}>();
	const { t } = useI18n();
</script>

<style scoped></style>
