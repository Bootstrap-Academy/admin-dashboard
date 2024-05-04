<template>
	<form
		class="flex flex-col"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<Input
			label="Inputs.SkillID"
			v-model="form.id.value"
			@valid="form.id.valid = $event"
			:rules="form.id.rules"
		/>
		<Input
			label="Inputs.SkillName"
			v-model="form.name.value"
			@valid="form.name.valid = $event"
			:rules="form.name.rules"
		/>
		<Input
			label="Inputs.SkillIcon"
			v-model="form.icon.value"
			@valid="form.icon.valid = $event"
			:rules="form.icon.rules"
		/>

		<InputList
			label="Inputs.SkillDependencies"
			v-model="form.dependencies.value"
			@valid="form.dependencies.valid = $event"
			:rules="form.dependencies.rules"
		/>

		<InputList
			v-if="!isRoot"
			label="Inputs.SkillCourses"
			v-model="form.courses.value"
			@valid="form.courses.valid = $event"
			:rules="form.courses.rules"
		/>

		<InputBtn full :loading="form.submitting" @click="onclickSubmitForm()">
			<span v-if="!!data">Update</span>
			<span v-else>Create New Skill</span>
			{{ row }},{{ col }}
		</InputBtn>

		<InputBtn
			v-if="!!data"
			class="mt-card"
			secondary
			full
			:loading="deleteLoading"
			@click="onclickDeleteSkill()"
		>
			Delete Skill
		</InputBtn>
	</form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { PropType, Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IForm } from '~/types/form';

export default defineComponent({
  props: {
    rootSkillID: { type: String, default: '' },
    subSkillID: { type: String, default: '' },
    isRoot: { type: Boolean, default: false },
    col: { type: Number, default: null },
    row: { type: Number, default: null },
    data: { type: Object as PropType<any>, default: null },
  },
  setup(props) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      id: {
        valid: false,
        value: '',
        rules: [(v: string) => Boolean(v) || 'Error.InputEmpty_Inputs.SkillID'],
      },
      name: {
        valid: false,
        value: '',
        rules: [(v: string) => Boolean(v) || 'Error.InputEmpty_Inputs.SkillName'],
      },
      icon: {
        valid: true,
        value: '',
        rules: [],
      },
      dependencies: {
        valid: true,
        value: [],
        rules: [],
      },
      courses: {
        valid: true,
        value: [],
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

    // ============================================================= Pre-Set Form
    watch(
      () => props.data,
      (newValue, oldValue) => {
        form.id.value = newValue?.id ?? '';
        form.id.valid = Boolean(form.id.value);

        form.name.value = newValue?.name ?? '';
        form.name.valid = Boolean(form.name.value);

        form.icon.value = newValue?.icon ?? '';
        form.dependencies.value = newValue?.dependencies ?? [];
        form.courses.value = newValue?.courses ?? [];
      },
      { immediate: true, deep: true }
    );

    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        const [success, error] = (props.data)
          ? await updateSkill(props.rootSkillID, props.subSkillID, {
            ...form.body(),
            column: props.col,
            row: props.row,
					  })
          : await createNewSkill(props.rootSkillID, {
            ...form.body(),
            column: props.col,
            row: props.row,
					  });
        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    const deleteLoading = ref(false);
    function onclickDeleteSkill() {
      openDialog(
        'warning',
        "Delete Skill",
        `Are you sure you want to delete ${
          props.data?.name ?? 'this skill'
        }. This action cannot be undone.`,
        false,
        {
          label: 'Yes, Delete Skill',
          onclick: async () => {
            deleteLoading.value = true;
            const [success, error] = await deleteSkill(
              props.rootSkillID,
              props.subSkillID
            );
            deleteLoading.value = false;

            success ? successHandler(success) : errorHandler(error);
          },
        },
        {
          label: 'Cancel',
          onclick: () => {},
        }
      );
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
      deleteLoading,
      onclickDeleteSkill,
    };
  },
});
</script>

<style scoped></style>
