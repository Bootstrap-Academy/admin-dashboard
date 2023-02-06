<template>
	<form
		class="rounded shadow-xl flex items-center overflow-clip h-fit bg-accent w-full max-w-sm"
		@submit.prevent="onenter()"
	>
		<input
			type="text"
			:placeholder="translatedPlaceholder"
			@change="onchange"
			v-model.trim="search"
			class="py-2 px-4 text-primary text-body-1 font-body placeholder:text-secondary placeholder:text-body-1 placeholder:font-body outline-none w-full"
		/>

		<button
			@click.prevent="onenter"
			class="px-4 bg-accent"
			:class="{ 'pointer-events-none': loading }"
		>
			<LoadingCircular v-if="loading" />
			<MagnifyingGlassIcon v-else class="h-5 w-5 fill-white" />
		</button>
	</form>
</template>

<script>
import { MagnifyingGlassIcon } from '@heroicons/vue/24/solid/index.js';
import { useI18n } from 'vue-i18n';

export default {
	props: {
		loading: { type: Boolean, default: false },
		placeholder: { type: String, default: '' },
		modelValue: { type: String, default: '' },
		enterOnly: { type: Boolean, default: false },
	},
	emits: ['update:modelValue'],
	components: { MagnifyingGlassIcon },
	setup(props, { emit }) {
		const search = ref(props.modelValue);

		function onchange() {
			if (props.enterOnly == true) return;
			emit('update:modelValue', search.value);
		}

		function onenter() {
			emit('update:modelValue', search.value);
		}

		const { t } = useI18n();

		const translatedPlaceholder = computed(() => {
			return t(props.placeholder);
		});

		return {
			MagnifyingGlassIcon,
			translatedPlaceholder,
			search,
			onchange,
			onenter,
		};
	},
};
</script>

<style scoped></style>
