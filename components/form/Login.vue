<template>
	<form
		class="flex flex-col gap-1"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			:label="t('Inputs.EmailOrUsername')"
			v-model="form.name_or_email.value"
			@valid="form.name_or_email.valid = $event"
			:rules="form.name_or_email.rules"
			autocomplete="username"
		/>
		<Input
			:label="t('Inputs.Password')"
			type="password"
			id="current-password"
			autocomplete="current-password"
			v-model="form.password.value"
			@valid="form.password.valid = $event"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t('Buttons.Login') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useReCaptcha } from 'vue-recaptcha-v3';
import { IForm } from '~/types/form';

export default defineComponent({
	setup() {
		const { t } = useI18n();

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			name_or_email: {
				valid: false,
				value: '',
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.EmailOrUsername',
				],
			},
			password: {
				valid: false,
				value: '',
				rules: [(v: string) => !!v || 'Error.InputEmpty_Inputs.Password'],
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

		// ============================================================= reCaptcha
		const { executeRecaptcha, recaptchaLoaded }: any = useReCaptcha();
		const getReCaptchaToken = async () => {
			try {
				await recaptchaLoaded();
				const token = await executeRecaptcha('login');
				return token;
			} catch (error) {
				return null;
			}
		};

		// ============================================================= Checks
		const router = useRouter();
		const user: Ref<any> = useUser();
		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;

				let recaptcha_response = await getReCaptchaToken();

				const [success, error] = await login({
					...form.body(),
					recaptcha_response: recaptcha_response,
				});

				form.submitting = false;

				// checking is logged in user is admin or not
				if (!!success && user.value.admin == false) {
					errorHandler({ detail: 'Error.NotAuthorized' });
					setStates(null);
					return;
				}

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		function successHandler(res: any) {
			router.push(`/dashboard`);
		}

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
