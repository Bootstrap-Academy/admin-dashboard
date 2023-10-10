<template>
	<section class="w-full">
		<article class="flex gap-box">
			<Input
				:label="label"
				v-model="input.value"
				@valid="onvalid($event)"
				:rules="input.rules"
				class="w-full"
			/>
			<PlusCircleIcon
				@click="onclickAddToList"
				class="w-14 h-14 text-accent mt-6 cursor-pointer transition-basic scale-100 hover:scale-105"
			/>
		</article>

		<ul class="grid mb-card-sm">
			<li
				v-for="(item, i) of modelValue"
				:key="`${label}-${i}`"
				class="transition-basic bg-transparent hover:bg-tertiary py-1.5 px-3 rounded-md"
			>
				<p :title="item" class="clamp line-1 max-w-full">{{ item }}</p>

				<XMarkIcon
					@click="onclickRmFromList(i)"
					class="w-5 h-5 mt-1 cursor-pointer transition-basic scale-100 hover:scale-110 text-error opacity-50 hover:opacity-100 mr-0.5"
				/>
			</li>
		</ul>
	</section>
</template>

<script lang="ts">
import { defineComponent, Ref } from 'vue';
import { PlusCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid/index.js';

export default defineComponent({
	props: {
		label: { type: String, default: '' },
		rules: { type: Array, default: [] },
		modelValue: { default: [] },
	},
	emits: ['update:modelValue', 'valid'],
	components: { PlusCircleIcon, XMarkIcon },
	setup(props, { emit }) {
		const input = reactive({
			valid: false,
			value: '',
			rules: [
				(v: string) => {
					if (!v && Boolean(addToList.value)) {
						return 'Cannot add empty string to list';
					} else return true;
				},
				(v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
				...props.rules,
			],
		});

		const addToList = ref(false);

		function onclickAddToList() {
			addToList.value = true;
			if (Boolean(!input.value)) return;

			let isSame = props.modelValue.find(
				(item: string) =>
					item.toLocaleLowerCase() == input.value.toLocaleLowerCase()
			);

			if (Boolean(!isSame)) {
				emit('update:modelValue', [...props.modelValue, input.value]);
			}

			input.value = '';

			setTimeout(() => {
				addToList.value = false;
			}, 0);
		}

		function onclickRmFromList(index: number) {
			let copyOfArray = [...props.modelValue];
			copyOfArray.splice(index, 1);
			emit('update:modelValue', [...copyOfArray]);
		}

		function onvalid(status: boolean) {
			emit('valid', status);
		}

		return { input, onvalid, onclickAddToList, onclickRmFromList };
	},
});
</script>

<style scoped>
ul {
	position: relative;
	list-style: none !important;
}
ul li {
	display: grid;
	grid-template-columns: 5px 1fr auto;
	gap: 1.25em;
	align-items: start;
}
ul li::before {
	content: '•';
}
</style>
