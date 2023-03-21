<template>
	<Dialog :dialog="dialog">
		<template #content>
			<form
				class="flex flex-col gap-1 mt-box"
				:class="{ 'form-submitting': form.submitting }"
				@submit.prevent="onclickSubmitForm()"
				ref="refForm"
			>
				<h2
					class="text-heading-3 py-2 px-4 border-2 border-dashed border-info bg-info-light text-info w-fit mb-card"
				>
					Total Coins: {{ coins }} {{ calcType }} {{ form.coins.value }} =
					{{ totalCoins }}
				</h2>
				<article class="flex gap-card">
					<InputSelect
						label="Type"
						id="calcType"
						:options="calcTypeOptions"
						v-model="calcType"
					/>
					<Input
						label="Number of Coins"
						type="number"
						v-model="form.coins.value"
						@valid="form.coins.valid = $event"
						:rules="form.coins.rules"
					/>
				</article>
				<InputTextarea
					label="Description"
					v-model="form.description.value"
					@valid="form.description.valid = $event"
					:rules="form.description.rules"
				/>

				<InputSwitch
					label="Add To Credit Note"
					v-model="form.credit_note.value"
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
				value: 0,
				rules: [
					(v: number) => !!v || 'Coins cannot be empty',
					(v: number) => v >= 0 || 'Coins cannot be less than 0',
				],
			},
			description: {
				valid: false,
				value: '',
				rules: [(v: number) => !!v || 'Description cannot be empty'],
			},
			credit_note: {
				valid: true,
				value: false,
				rules: [],
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

				let body = form.body();
				const [success, error] = await setBalanceOfThisUser(props.id, {
					...body,
					coins: calcType.value == '-' ? body.coins * -1 : body.coins,
				});

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
			emit('coins', totalCoins.value);
		}

		function errorHandler(res: any) {
			openSnackbar('error', res?.detail ?? '');
			emit('isSuccess', false);
		}

		const totalCoins = computed(() => {
			return calcType.value == '+'
				? props.coins + form.coins.value
				: props.coins - form.coins.value;
		});

		const calcTypeOptions = [
			{
				label: 'Add',
				value: '+',
			},
			{
				label: 'Minus',
				value: '-',
			},
		];
		const calcType = ref('+');

		return {
			form,
			onclickSubmitForm,
			refForm,
			dialog,
			totalCoins,
			calcTypeOptions,
			calcType,
		};
	},
});
</script>

<style scoped></style>
