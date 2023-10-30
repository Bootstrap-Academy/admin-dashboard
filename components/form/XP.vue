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
					type="number"
					v-model="form.xp.value"
					@valid="form.xp.valid = $event"
					:rules="form.xp.rules"
				/>
			</form>
		</template>
	</Dialog>
</template>

<script lang="ts">
import { defineComponent, inject } from 'vue';
import type { Ref } from 'vue';
import type { IForm } from '~/types/form';

export default defineComponent({
	props: {
		skill: { type: String, default: '' },
		subSkill: { type: String, default: '' },
		subSkillXP: { type: Number, default: 0 },
	},
	emits: ['isSuccess', 'subSkill'],
	setup(props, { emit }) {
		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			xp: {
				valid: false,
				value: props.subSkillXP,
				rules: [
					(v: number) => !!v || 'XP cannot be empty',
					(v: number) => v >= 0 || 'XP cannot be less than 0',
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
			heading: 'Manage XP',
			body: `Set XP for sub skill ${props.subSkill} of ${props.skill}. The current XP is ${props.subSkillXP}`,
			primaryBtn: {
				label: 'Set XP',
				onclick: onclickSubmitForm,
			},
			secondaryBtn: {
				label: 'Cancel',
				onclick: () => {
					emit('isSuccess', false);
				},
			},
		});

		const userID: any = inject('userID');

		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				setLoading(true);
				form.submitting = true;

				const [success, error] = await setXPOfThisUser(
					userID.value,
					props.skill,
					props.subSkill,
					form.xp.value
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
			emit('subSkill', res);
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
