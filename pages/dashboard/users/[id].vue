<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Recaptcha
❌ Preset Form
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<main>
		<Head>
			<Title>Manage User - {{ appUser?.name ?? '' }}</Title>
		</Head>

		<div class="flex justify-between items-center flex-wrap gap-card">
			<PageTitle />
			<Btn secondary @click="onclickDeleteUser">Delete User</Btn>
		</div>

		<div
			class="grid grid-cols-1 midXl:grid-cols-[1fr_auto] gap-container mt-card"
		>
			<AppUsersProfile :data="appUser" class="w-full" />
			<AppUsersAccount :data="appUser" class="w-full md:min-w-[400px]" />
			<AppUsersProgress :data="appUser" class="midXl:col-span-2" />
		</div>
	</main>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';
import type { Ref } from 'vue';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

export default {
  head: {
    title: 'Manage User - ',
  },
  setup() {
    const { t } = useI18n();

    const route = useRoute();

    const userID = computed(() => {
      return <string>(route?.params?.id ?? '');
    });

    const loading = ref(true);
    const appUser: Ref<any> = useAppUser();

    const userName = computed(() => {
      return appUser.value?.name ?? 'User';
    });

    onMounted(async () => {
      loading.value = true;
      await getAppUser(userID.value);
      loading.value = false;
    });

    const router = useRouter();
    async function onclickDeleteUser() {
      openDialog(
        'warning',
        'Headings.DeleteUser',
        'Body.DeleteUser',
        false,
        {
          label: 'Buttons.DeleteUser',
          onclick: async () => {
            setLoading(true);
            const [success, error] = await deleteAppUser(userID.value);
            setLoading(false);

            if (success) {
              router.push('/dashboard/users');
              setTimeout(() => {
                openSnackbar(
                  'success',
                  t('Success.DeleteUser', { placeholder: userName.value })
                );
              }, 1000);
            } else {
              openSnackbar('error', error?.detail ?? '');
            }
          },
        },
        {
          label: 'Buttons.Cancel',
          onclick: () => {},
        }
      );
    }

    return { appUser, onclickDeleteUser };
  },
};
</script>
