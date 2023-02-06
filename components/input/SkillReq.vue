<template>
	<section class="w-full">
		<article
			class="grid gap-box grid-cols-[minmax(0,1fr)_minmax(0,150px)_auto]"
		>
			<Input
				label="Skill Name"
				v-model="skill.value"
				@valid="onvalid($event)"
				:rules="skill.rules"
				class="w-full"
			/>

			<Input
				label="Requirement"
				type="number"
				v-model="requirement.value"
				@valid="onvalid($event)"
				:rules="requirement.rules"
				class="w-full"
			/>

			<PlusCircleIcon
				@click="onclickAddToList"
				class="w-14 h-14 text-accent mt-6 cursor-pointer transition-basic scale-100 hover:scale-105"
			/>
		</article>

		<ul class="grid mb-card-sm">
			<li
				v-for="(value, key) in modelValue"
				:key="key"
				class="transition-basic bg-transparent hover:bg-tertiary py-1.5 px-3 rounded-md"
			>
				{{ key }} - {{ value }}

				<XMarkIcon
					@click="onclickRmFromList(key)"
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
		modelValue: { default: {} },
	},
	emits: ['update:modelValue', 'valid'],
	components: { PlusCircleIcon, XMarkIcon },
	setup(props, { emit }) {
		const skill = reactive({
			valid: false,
			value: '',
			rules: [
				(v: string) => {
					if (!v && !!addToList.value) {
						return 'Cannot add empty string to list';
					} else return true;
				},
				(v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
				...props.rules,
			],
		});

		const requirement = reactive({
			valid: false,
			value: 1,
			rules: [(v: number) => v > 0 || 'Error.InputMinLength_0', ...props.rules],
		});

		const addToList = ref(false);

		function onclickAddToList() {
			addToList.value = true;
			if (!!!skill.value) return;

			const keys = Object.keys(props.modelValue);

			let isSame = (keys ?? []).find(
				(key: string) =>
					key.toLocaleLowerCase() == skill.value.toLocaleLowerCase()
			);

			if (!!!isSame) {
				let obj: any = {};
				obj[skill.value.toString()] = requirement.value;
				emit('update:modelValue', { ...props.modelValue, ...obj });
			}

			skill.value = '';
			requirement.value = 1;

			setTimeout(() => {
				addToList.value = false;
			}, 0);
		}

		function onclickRmFromList(key: string) {
			let copyOfObj: any = { ...props.modelValue };

			delete copyOfObj[key];

			emit('update:modelValue', { ...copyOfObj });
		}

		function onvalid(status: boolean) {
			emit('valid', status);
		}

		return { skill, requirement, onvalid, onclickAddToList, onclickRmFromList };
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
