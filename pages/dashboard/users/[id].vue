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
			<AppUsersProfile :key="supportContext" :data="appUser" class="w-full" />
			<AppUsersAccount :key="supportContext" :data="appUser" class="w-full md:min-w-[400px]" />
			<AppUsersPublication v-if="publicationEnabled" :key="supportContext" :user-id="userID" class="midXl:col-span-2" />
			<AppUsersProgress :key="supportContext" :data="appUser" class="midXl:col-span-2" />
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
    const publicationFlag = useRuntimeConfig().public.PROFILE_PUBLICATION_ENABLED;
    const publicationEnabled = publicationFlag === true || String(publicationFlag) === 'true';

    const userID = computed(() => {
      return <string>(route?.params?.id ?? '');
    });

    const appUser: Ref<any> = useAppUser();
    const viewer = useUser(), viewerSession = useSession();
    const supportContext = computed(() => JSON.stringify([userID.value, viewer.value?.id, viewerSession.value?.id]));
    let userLoad = 0;

    const userName = computed(() => {
      return appUser.value?.name ?? 'User';
    });

    watch([userID, () => viewer.value?.id, () => viewerSession.value?.id], async ([id]) => {
      const attempt = ++userLoad;
      appUser.value = null;
      await getAppUser(id, () => userID.value === id && userLoad === attempt);
    }, { immediate: true, flush: 'sync' });

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

    return { appUser, onclickDeleteUser, userID, publicationEnabled, supportContext };
  },
};
</script>
