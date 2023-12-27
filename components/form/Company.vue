<template>
	<form
		class="grid grid-cols-1 md:grid-cols-2 gap-x-card gap-y-2"
		:class="{ 'form-submitting': form.submitting }"
		@submit.prevent="onclickSubmitForm()"
		ref="refForm"
	>
		<h2 class="text-heading-3 md:col-span-2 mb-card flex gap-card items-center">
			<span class="inline-block flex-shrink-0">Company Information</span>
			<hr class="w-full" />
		</h2>
		<Input
			label="Inputs.CompanyName"
			v-model="form.name.value"
			@valid="form.name.valid = $event"
			:rules="form.name.rules"
		/>

		<Input
			label="Inputs.LogoURL"
			v-model="form.logo_url.value"
			@valid="form.logo_url.valid = $event"
			:rules="form.logo_url.rules"
		/>

		<Input
			label="Inputs.CompanyWebsite"
			v-model="form.website.value"
			@valid="form.website.valid = $event"
			:rules="form.website.rules"
		/>

		<InputTextarea
			class="md:col-span-2"
			label="Inputs.Description"
			v-model="form.description.value"
			@valid="form.description.valid = $event"
			:rules="form.description.rules"
			:max="255"
		/>

		<h2
			class="text-heading-3 md:col-span-2 mt-card pt-card mb-card flex gap-card items-center"
		>
			<span class="inline-block flex-shrink-0">Social Media</span>
			<hr class="w-full" />
		</h2>

		<Input
			label="Inputs.TwitterHandle"
			v-model="form.twitter_handle.value"
			@valid="form.twitter_handle.valid = $event"
			:rules="form.twitter_handle.rules"
		/>

		<Input
			label="Inputs.InstagramHandle"
			v-model="form.instagram_handle.value"
			@valid="form.instagram_handle.valid = $event"
			:rules="form.instagram_handle.rules"
		/>

		<Input
			class="md:col-span-2"
			label="Inputs.YoutubeVideoURL"
			v-model="form.youtube_video.value"
			@valid="form.youtube_video.valid = $event"
			:rules="form.youtube_video.rules"
		/>

		<InputBtn
			:loading="form.submitting"
			class="md:col-span-2 self-end justify-self-end"
			@click="onclickSubmitForm()"
			mt
		>
			{{ t(!!data ? 'Buttons.EditCompany' : 'Buttons.CreateCompany') }}
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
      name: {
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
      website: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
        ],
      },
      youtube_video: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
        ],
      },
      twitter_handle: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
        ],
      },
      instagram_handle: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
        ],
      },
      logo_url: {
        valid: true,
        value: '',
        rules: [
          (v: string) => !v || v.length >= 3 || 'Error.InputMinLength_3',
          (v: string) => v.length <= 255 || 'Error.InputMaxLength_255',
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
        if (!newValue) return;
        form.name.value = newValue?.name ?? '';
        form.description.value = newValue?.description ?? '';
        form.website.value = newValue?.website ?? '';
        form.youtube_video.value = newValue?.youtube_video ?? '';
        form.twitter_handle.value = newValue?.twitter_handle ?? '';
        form.instagram_handle.value = newValue?.instagram_handle ?? '';
        form.logo_url.value = newValue?.logo_url ?? '';
      },
      { immediate: true, deep: true }
    );
    // ============================================================= functions
    async function onclickSubmitForm() {
      if (form.validate()) {
        form.submitting = true;
        const [success, error] = (props.data)
          ? await editCompany(props.data.id, form.body())
          : await createCompany(form.body());
        form.submitting = false;

        success ? successHandler(success) : errorHandler(error);
      } else {
        openSnackbar('error', 'Error.InvalidForm');
      }
    }

    const router = useRouter();
    function successHandler(res: any) {
      router.push("/dashboard/companies");
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
