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
❌ Form Post Api Error  Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
  <main>
    <div ref="scrollRef"></div>
    <PageTitle />
    <ul
      class="flex flex-wrap text-sm font-medium text-center text-gray-500 dark:text-gray-400"
    >
      <li class="mr-2">
        <button
          :class="
            !emailSearch
              ? 'inline-block px-4 py-3 rounded-lg hover:text-white'
              : 'inline-block px-4 py-3 text-accent bg-blue-600 rounded-lg'
          "
          @click="resetSearch(), (emailSearch = true)"
        >
          Email Search
        </button>
      </li>
      <li class="mr-2">
        <button
          :class="
            emailSearch
              ? 'inline-block px-4 py-3 rounded-lg hover:text-white'
              : 'inline-block px-4 py-3 text-accent bg-blue-600 rounded-lg active'
          "
          @click="resetSearch(), (emailSearch = false)"
        >
          Name Search
        </button>
      </li>
    </ul>
    <FormSearch
      class="mb-card-sm mt-card mt-0"
      :placeholder="emailSearch ? 'Search by Email' : 'Search by Name'"
      :modelValue="
        emailSearch ? getUserRequestBody.email : getUserRequestBody.name
      "
      @update:modelValue="(newValue: string) => {
    if (emailSearch) {
      getUserRequestBody.email = newValue;

    } else {
      getUserRequestBody.name = newValue;
    }
  }"
      @search="userSearch"
    />

    <div class="flex items-center justify-between text-accent text-sm">
      {{ t('Headings.Result', { n: totalAppUsers }, totalAppUsers) }}
      <div class="flex gap-2">
        <button
          @click="modalOpen = true"
          class="inline-block rounded-full bg-accent px-6 pb-2 pt-2 text-xs font-medium leading-normal text-primary hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] hover:scale-105"
        >
          Filter
        </button>
        <button
          @click="resetAllFilter"
          class="inline-block rounded-full bg-accent px-6 pb-2 pt-2 text-xs font-medium leading-normal text-primary hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] hover:scale-105"
        >
          Reset Filter
        </button>
      </div>
    </div>

    <AppUsersTable :data="appUsers" :loading="loading" />

    <Pagination
      :current="currentPage"
      :total-results="totalAppUsers"
      :perPage="getUserRequestBody.limit"
      @change="changePage"
      @change-per-page="changePerPage"
    />

    <ScrollToBtn :scrollRef="scrollRef" />

    <Modal
      v-if="modalOpen"
      @hide-modal="modalOpen = false"
      @backdrop="modalOpen = false"
    >
      <Select
        @cancel="(modalOpen = false), resetExpandedSearchOptions()"
        v-model="expandedSearchOptions"
        @save="expandedSearch"
        ok-label="Apply"
      />
    </Modal>
  </main>
</template>

<script lang="ts">
import type { Ref } from 'vue';
import {
  USERSORT,
  USER_LOCALES,
  User,
  UserSearchRequestBody,
} from '@/types/userTypes';
import { getUserTest, getAppUsers } from '@/composables/appUsers';
import { useI18n } from 'vue-i18n';
import { CheckOption } from '~/types/componentTypes';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

export default {
  head: {
    title: 'Users',
  },
  setup() {
    onMounted(() => {
      userSearch();
      resetExpandedSearchOptions();
    });
    const { t } = useI18n();
    const scrollRef = ref<HTMLElement | undefined>(undefined);

    const appUsers: Ref<User[]> = useAppUsers();
    const totalAppUsers: Ref<number> = useTotalAppUsers();

    const emailSearch = ref(true);
    const loading = ref(appUsers.value.length <= 0);
    const modalOpen = ref(false);
    const getUserRequestBody = reactive(new UserSearchRequestBody());

    const userSearch = async () => {
      loading.value = true;
      await getAppUsers(getUserRequestBody)
        .then(() => {
          loading.value = false;
        })
        .catch((error) => {
          loading.value = false;
          throw new Error('Error in userSearch', error);
        });
    };

    const changePage = (page: number) => {
      currentPage.value = page;
      getUserRequestBody.offset = (page - 1) * getUserRequestBody.limit;
      userSearch();
    };

    const changePerPage = (pageSize: number) => {
      getUserRequestBody.limit = pageSize;
      changePage(1);
      userSearch();
    };

    const resetSearch = () => {
      getUserRequestBody.clearSearch();
      userSearch();
    };

    const resetAllFilter = () => {
      getUserRequestBody.clearFilters();
      getUserRequestBody.clearSearch();
      userSearch();
      resetExpandedSearchOptions();
    };
    const currentPage = ref<number>(1);

    const expandedSearchOptions = ref<CheckOption[]>([]);

    const resetExpandedSearchOptions = () => {
      expandedSearchOptions.value.splice(0);
      expandedSearchOptions.value.push(
        new CheckOption(USER_LOCALES.USER_ENABLED),
        new CheckOption(USER_LOCALES.USER_ADMIN),
        new CheckOption(USER_LOCALES.USER_MFA),
        new CheckOption(USER_LOCALES.USER_EMAIL_VERIFIED),
        new CheckOption(USER_LOCALES.USER_NEWSLETTER)
      );
    };

    const expandedSearch = (options: CheckOption[]) => {
      options.forEach((option) => {
        switch (option.label) {
        case USER_LOCALES.USER_ENABLED:
          getUserRequestBody.enabled = option.value;
          break;
        case USER_LOCALES.USER_ADMIN:
          getUserRequestBody.admin = option.value;
          break;
        case USER_LOCALES.USER_MFA:
          getUserRequestBody.mfa_enabled = option.value;
          break;
        case USER_LOCALES.USER_EMAIL_VERIFIED:
          getUserRequestBody.email_verified = option.value;
          break;
        case USER_LOCALES.USER_NEWSLETTER:
          getUserRequestBody.newsletter = option.value;
          break;
        }
      });
      userSearch();
      modalOpen.value = false;
    };

    const options = [
      {
        label: 'Headings.None',
        value: USERSORT.NONE,
      },
      {
        label: 'Headings.Enabled',
        value: USERSORT.ENABLED,
      },
      {
        label: 'Headings.UserDisabled',
        value: USERSORT.DISABLED,
      },
      {
        label: 'Headings.Admin',
        value: USERSORT.ADMIN,
      },
      {
        label: 'Headings.MFA',
        value: USERSORT.MFA,
      },
      {
        label: 'Headings.NOMFA',
        value: USERSORT.NOMFA,
      },
      {
        label: 'Headings.Verified',
        value: USERSORT.EMAILVERIFIED,
      },
      {
        label: 'Headings.NotVerified',
        value: USERSORT.NOTEMAILVERIFIED,
      },
      {
        label: 'Headings.Newsletter',
        value: USERSORT.NEWSLETTER,
      },
      {
        label: 'Headings.NoNewsletter',
        value: USERSORT.NOTNEWSLETTER,
      },
    ];

    async function onSelectedOption(option: USERSORT) {
      switch (option) {
      case USERSORT.NONE:
        getUserRequestBody.clearFilters();
        getUserRequestBody.clearSearch();
        userSearch();
        break;
      case USERSORT.ENABLED:
        getUserRequestBody.clearFilters();
        getUserRequestBody.enabled = true;
        getUserRequestBody.admin = false;
        userSearch();
        break;
      case USERSORT.DISABLED:
        getUserRequestBody.clearFilters();
        getUserRequestBody.enabled = false;
        userSearch();
        break;
      case USERSORT.ADMIN:
        getUserRequestBody.clearFilters();
        getUserRequestBody.admin = true;
        userSearch();
        break;
      case USERSORT.MFA:
        getUserRequestBody.clearFilters();
        getUserRequestBody.mfa_enabled = true;
        userSearch();
        break;
      case USERSORT.NOMFA:
        getUserRequestBody.clearFilters();
        getUserRequestBody.mfa_enabled = false;
        userSearch();
        break;
      case USERSORT.EMAILVERIFIED:
        getUserRequestBody.clearFilters();
        getUserRequestBody.email_verified = true;
        userSearch();
        break;
      case USERSORT.NOTEMAILVERIFIED:
        getUserRequestBody.clearFilters();
        getUserRequestBody.email_verified = false;
        userSearch();
        break;
      case USERSORT.NEWSLETTER:
        getUserRequestBody.clearFilters();
        getUserRequestBody.newsletter = true;
        userSearch();
        break;
      case USERSORT.NOTNEWSLETTER:
        getUserRequestBody.clearFilters();
        getUserRequestBody.newsletter = false;
        userSearch();
        break;
      }
    }

    return {
      loading,
      appUsers,
      onSelectedOption,
      options,
      scrollRef,
      totalAppUsers,
      emailSearch,
      getUserRequestBody,
      UserSearchRequestBody,
      userSearch,
      resetSearch,
      changePage,
      currentPage,
      changePerPage,
      modalOpen,
      t,
      expandedSearchOptions,
      expandedSearch,
      resetAllFilter,
      resetExpandedSearchOptions,
    };
  },
};
</script>
