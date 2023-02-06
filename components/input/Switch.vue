<template>
	<div class="flex gap-card-sm items-center">
		<label v-if="label" class="text-body-2 text-body font-body block" :for="id">
			{{ t(label) }}
		</label>
		<label class="inline-flex relative items-center cursor-pointer">
			<input
				type="checkbox"
				value=""
				:id="id"
				class="sr-only peer"
				v-model="input"
			/>
			<div
				class="p-2 w-16 h-8 rounded-full peer bg-[#2d405c] peer-checked:bg-accent after:translate-x-[4px] peer-checked:after:translate-x-[36px] after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all duration-500 ease-out"
			></div>
		</label>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		modelValue: { type: Boolean, default: false },
		label: { type: String, default: '' },
		id: { type: String, default: '' },
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const input = computed({
			get() {
				return props.modelValue;
			},
			set(value) {
				emit('update:modelValue', value);
			},
		});
		return { t, input };
	},
});
</script>

<style scoped></style>
