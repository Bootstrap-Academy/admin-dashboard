<template>
	<form
		class="grid grid-cols-1 md:grid-cols-2 gap-x-card gap-y-2"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<p
			v-if="!loading && companiesList.length <= 0"
			class="box style-box bg-warning-light text-warning md:col-span-2 mb-card w-fit mx-auto"
		>
			Please create a company in order to create job
		</p>

		<Input
			class="md:col-span-2"
			label="Inputs.JobTitle"
			v-model="form.title.value"
			@valid="form.title.valid = $event"
			:rules="form.title.rules"
		/>
		<p v-if="loading" class="card capitalize">getting company ids</p>
		<InputSelect
			v-else-if="companiesList && companiesList.length > 0"
			label="Inputs.CompanyId"
			id="company_id"
			:options="companiesList"
			v-model="form.company_id.value"
		/>
		<p v-else class="card">No Companies Available</p>

		<Input
			label="Inputs.Contact"
			v-model="form.contact.value"
			@valid="form.contact.valid = $event"
			:rules="form.contact.rules"
		/>
		<Input
			label="Inputs.JobLocation"
			v-model="form.location.value"
			@valid="form.location.valid = $event"
			:rules="form.location.rules"
		/>
		<InputSwitch
			id="remote"
			label="Inputs.Remote"
			v-model="form.remote.value"
		/>
		<InputRadioGroup
			class="mt-card"
			label="Inputs.JobType"
			classesForCheckbox="mt-card"
			name="job_type"
			v-model="form.type.value"
			:options="form.type.options"
		/>
		<InputRadioGroup
			class="mt-card"
			label="Inputs.ProfessionalLevel"
			classesForCheckbox="mt-card"
			name="professional_level"
			v-model="form.professional_level.value"
			:options="form.professional_level.options"
		/>
		<h2
			class="text-heading-3 md:col-span-2 mt-container mb-card flex gap-card items-center"
		>
			<span class="inline-block flex-shrink-0">Job Salary</span>
			<hr class="w-full" />
		</h2>

		<Input
			label="Inputs.SalaryMin"
			type="number"
			:max="form.salary.value.max"
			v-model="form.salary.value.min"
			@valid="form.salary.valid = $event"
			:rules="form.salary.rules"
		/>
		<Input
			label="Inputs.SalaryMax"
			type="number"
			:min="form.salary.value.min"
			v-model="form.salary.value.max"
			@valid="form.salary.valid = $event"
			:rules="form.salary.rules"
		/>
		<Input
			label="Inputs.SalaryUnit"
			v-model="form.salary.value.unit"
			@valid="form.salary.valid = $event"
			:rules="form.salary.rules"
		/>
		<Input
			label="Inputs.SalaryPer"
			v-model="form.salary.value.per"
			@valid="form.salary.valid = $event"
			:rules="form.salary.rules"
		/>
		<h2
			class="text-heading-3 md:col-span-2 mt-container mb-card flex gap-card items-center"
		>
			<span class="inline-block flex-shrink-0">Job Details</span>
			<hr class="w-full" />
		</h2>
		<InputTextarea
			class="md:col-span-2"
			label="Inputs.Description"
			v-model="form.description.value"
			@valid="form.description.valid = $event"
			:rules="form.description.rules"
			:max="2000"
		/>
		<InputList
			class="md:col-span-2"
			label="Inputs.Responsibilities"
			v-model="form.responsibilities.value"
			@valid="form.responsibilities.valid = $event"
			:rules="form.responsibilities.rules"
		/>
		<InputSkillReq
			class="md:col-span-2"
			label="Inputs.SkillRequirements"
			v-model="form.skill_requirements.value"
			@valid="form.skill_requirements.valid = $event"
			:rules="form.skill_requirements.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="self-end md:col-span-2 justify-self-end"
			@click="onclickSubmitForm()"
			mt
			:class="
				companiesList && companiesList.length > 0
					? ''
					: 'pointer-events-none opacity-60'
			"
		>
			{{ t(!!data ? 'Buttons.EditJob' : 'Buttons.CreateJob') }}
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, PropType, Ref, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IForm } from '~/types/form';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
		companiesList: { type: Array as PropType<any[]>, default: [] },
		loading: { type: Boolean, default: true },
	},
	setup(props) {
		const { t } = useI18n();

		// ============================================================= refs
		const refForm = ref<HTMLFormElement | null>(null);

		// ============================================================= reactive
		const form = reactive<IForm>({
			salary: {
				valid: false,
				value: {
					min: 0,
					max: 200,
					unit: 'MC',
					per: 'task',
				},
				rules: [(v: any) => !!v || 'Error.InputEmpty_Inputs.ThisField'],
			},
			company_id: {
				valid: true,
				value: '',
				options: props.companiesList,
			},
			title: {
				valid: false,
				value: '',
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.JobTitle',
					(v: string) => !v || v.length >= 5 || 'Error.InputMinLength_5',
					(v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
				],
			},
			contact: {
				valid: false,
				value: '',
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Contact',
					(v: string) => !v || v.length >= 5 || 'Error.InputMinLength_5',
					(v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
				],
			},
			location: {
				valid: false,
				value: '',
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.JobLocation',
					(v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
				],
			},
			remote: {
				valid: true,
				value: false,
			},
			type: {
				valid: true,
				value: 'full_time',
				options: [
					{
						value: 'full_time',
						label: 'List.Filter.FullTime',
					},
					{
						value: 'internship',
						label: 'List.Filter.Internship',
					},
					{
						value: 'part_time',
						label: 'List.Filter.PartTime',
					},
					{
						value: 'temporary',
						label: 'List.Filter.Temporary',
					},
					{
						value: 'mini_job',
						label: 'List.Filter.MiniJob',
					},
				],
			},
			professional_level: {
				valid: true,
				value: 'entry',
				options: [
					{
						value: 'entry',
						label: 'List.Filter.Entry',
					},
					{
						value: 'junior',
						label: 'List.Filter.Junior',
					},
					{
						value: 'senior',
						label: 'List.Filter.Senior',
					},
					{
						value: 'manager',
						label: 'List.Filter.Manager',
					},
				],
			},
			description: {
				valid: false,
				value: '',
				rules: [
					(v: string) => !!v || 'Error.InputEmpty_Inputs.Description',
					(v: string) => v.length <= 2000 || 'Error.InputMaxLength_2000',
				],
			},
			responsibilities: {
				valid: false,
				value: [],
				rules: [
					(v: any) =>
						form.responsibilities.value.length > 0 ||
						'Error.InputEmpty_Inputs.Responsibilities',
				],
			},
			skill_requirements: {
				valid: false,
				value: {},
				rules: [
					(v: any) =>
						!!form.skill_requirements.value ||
						'Error.InputEmpty_Inputs.SkillRequirements',
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

		// ============================================================= Pre-set Input fields
		watch(
			() => props.data,
			(newValue, oldValue) => {
				if (!!!newValue) return;
				form.company_id.value = newValue?.company?.id ?? '';
				form.title.value = newValue?.title ?? '';
				form.contact.value = newValue?.contact ?? '';
				form.location.value = newValue?.location ?? '';
				form.remote.value = newValue?.remote ?? false;
				form.type.value = newValue?.type ?? 'full_time';
				form.professional_level.value = newValue?.professional_level ?? 'entry';
				form.description.value = newValue?.description ?? '';
				form.responsibilities.value = newValue?.responsibilities ?? [];
				form.responsibilities.valid = form.responsibilities.value.length > 0;

				(newValue?.skill_requirements ?? []).forEach((subArray: string[]) => {
					form.skill_requirements.value.push(subArray[0]);
				});
				form.skill_requirements.valid =
					form.skill_requirements.value.length > 0;
				form.salary.value.min = newValue?.salary?.min ?? 0;
				form.salary.value.max = newValue?.salary?.max ?? 0;
				form.salary.value.unit = newValue?.salary?.unit ?? 'MC';
				form.salary.value.per = newValue?.salary?.per ?? 'task';
			},
			{ immediate: true, deep: true }
		);
		// ============================================================= functions
		async function onclickSubmitForm() {
			if (form.validate()) {
				form.submitting = true;
				const [success, error] = !!props.data
					? await editJob(props.data.id, form.body())
					: await createJob(form.body());
				form.submitting = false;

				success ? successHandler(success) : errorHandler(error);
			} else {
				openSnackbar('error', 'Error.InvalidForm');
			}
		}

		const router = useRouter();
		function successHandler(res: any) {
			router.push(`/dashboard/jobs/${res.id}`);
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
