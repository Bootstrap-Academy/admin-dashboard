<template>
  <form class="grid grid-cols-1 md:grid-cols-2 gap-x-card gap-y-2" :class="{ 'form-submitting': form.submitting }"
    @submit.prevent="onclickSubmitForm()" ref="refForm">

    <h2 class="text-heading-3 md:col-span-2 mb-card flex gap-card items-center">
      <span class="inline-block flex-shrink-0">{{ t("Headings.ChallengeCategoryInformation") }}</span>
      <hr class="w-full" />
    </h2>

    <Input label="Headings.Title" v-model="form.title.value" @valid="form.title.valid = $event"
      :rules="form.title.rules" />

    <Input label="Headings.Description" v-model="form.description.value" @valid="form.description.valid = $event"
      :rules="form.description.rules" />

    <InputBtn :loading="form.submitting" class="md:col-span-2 self-end justify-self-end" @click="onclickSubmitForm()"
      mt>
      {{ t(!!data ? 'Headings.EditChallengeCategory' : 'Headings.CreateChallengeCategory') }}
    </InputBtn>
  </form>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import type { PropType, Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IForm } from '~/types/form';

export default defineComponent({
  props: { data: { type: Object as PropType<any>, default: null } },
  setup(props) {
    const { t } = useI18n();

    // ============================================================= refs
    const refForm = ref<HTMLFormElement | null>(null);

    // ============================================================= reactive
    const form = reactive<IForm>({
      title: {
        valid: false,
        value: '',
        rules: [
          (v: string) => Boolean(v) || 'Error.InputEmpty_Inputs.CompanyName',
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
        ],
      },
      description: {
        valid: true,
        value: '',
        rules: [(v: string) => v.length <= 255 || 'Error.InputMaxLength_255'],
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
      (newValue, _) => {
        if (!newValue) return;
        form.title.value = newValue?.title ?? '';
        form.description.value = newValue?.description ?? '';
      },
      { immediate: true, deep: true }
    );
    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        const [success, error] = (props.data)
          ? await editChallengeCategory(props.data.id, form.body())
          : await createChallengeCategory(form.body());
        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    const router = useRouter();
    function successHandler(res: any) {
      router.push("/dashboard/challenges");
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
