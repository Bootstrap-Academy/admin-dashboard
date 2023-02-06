<template>
	<form
		class="flex flex-col"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			label="Rows"
			type="number"
			v-model="form.rows.value"
			@valid="form.rows.valid = $event"
			:rules="form.rows.rules"
		/>

		<Input
			label="Columns"
			type="number"
			v-model="form.columns.value"
			@valid="form.columns.valid = $event"
			:rules="form.columns.rules"
		/>

		<InputBtn full :loading="form.submitting" @click="onclickSubmitForm()">
			Update
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	props: {
		rootSkillID: { type: String, default: '' },
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			rows: {
				valid: false,
				value: 0,
				rules: [(v: number) => (v && v >= 0) || 'Cannot be less than 0'],
			},
			columns: {
				valid: false,
				value: 0,
				rules: [(v: number) => (v && v >= 0) || 'Cannot be less than 0'],
			},
			submitting: false,
			validate: () => {
				let isValid = true;

				for (const key in form) {
					if (
						key != 'validate' &&
						key != 'body' &&
						key != 'submitting' &&
						!form[key].valid
					) {
						isValid = false;
					}
				}

				if (refForm.value) refForm.value.reportValidity();
				return isValid;
			},
			body: () => {
				let obj: any = {};
				for (const key in form) {
					if (key != 'validate' && key != 'body' && key != 'submitting')
						obj[key] = form[key].value;
				}
				return obj;
			},
		});

		// ============================================================= Pre-Set Form
		watch(
			() => props.data,
			(newValue, oldValue) => {
				form.rows.value = newValue?.rows ?? 0;
				form.columns.value = newValue?.columns ?? 0;
			},
			{ immediate: true, deep: true }
		);

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;
				const [success, error] = await updateTreeSettings(
					props.rootSkillID,
					form.body()
				);
				form.submitting = false;

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		function successHandler(res: any) {}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
		}

		return {
			form,
			onclickSubmitForm,
			refForm,
			t,
		};
	},
});
</script>

<style scoped></style>
