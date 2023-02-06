<template>
	<Dialog :dialog="dialog">
		<template #content>
			<form
				class="flex flex-col gap-1 mt-box"
				:class="{ 'form-submitting': form.submitting }"
				@submit.prevent="onclickSubmitForm()"
				ref="refForm"
			>
				<Input
					label="Coins"
					type="number"
					v-model="form.coins.value"
					@valid="form.coins.valid = $event"
					:rules="form.coins.rules"
				/>
			</form>
		</template>
	</Dialog>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { IForm } from '~/types/form';

export default defineComponent({
	props: {
		coins: { type: Number, default: 0 },
		id: { type: String, default: '' },
		name: { type: String, default: '' },
	},
	emits: ['isSuccess', 'coins'],
	setup(props, { emit }) {
		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			coins: {
				valid: false,
				value: props.coins,
				rules: [
					(v: number) => !!v || 'Coins cannot be empty',
					(v: number) => v >= 0 || 'Coins cannot be less than 0',
				],
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

		const dialog = <any>reactive({
			type: 'info',
			heading: 'Manage Balance',
			body: `Set balance for user: ${props.name}. Their current balance is ${props.coins}`,
			primaryBtn: {
				label: 'Set Balance',
				onclick: onclickSubmitForm,
			},
			secondaryBtn: {
				label: 'Cancel',
				onclick: () => {
					emit('isSuccess', false);
				},
			},
		});

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				setLoading(true);
				form.submitting = true;

				const [success, error] = await setBalanceOfThisUser(
					props.id,
					form.coins.value
				);

				form.submitting = false;
				setLoading(false);

				console.log('success', success);
				console.log('error', error);

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		function successHandler(res: any) {
			emit('isSuccess', true);
			emit('coins', form.coins.value);
		}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
			emit('isSuccess', false);
		}

		return {
			form,
			onclickSubmitForm,
			refForm,
			dialog,
		};
	},
});
</script>

<style scoped></style>
