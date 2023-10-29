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
      @update:modelValue="
        (newValue:string) => {
          if (emailSearch) {
            getUserRequestBody.email = newValue;
            
          } else {
            getUserRequestBody.name = newValue;
          }
        }
      "
      @search="userSearch"
    />

    <Sort
      text="Headings.FilterBy"
      class="mb-card"
      :options="options"
      :quantity="totalAppUsers"
      @selected="onSelectedOption($event)"
    />

    <AppUsersTable :data="appUsers" :loading="loading" />

    <Pagination
      :current="currentPage"
      :total-results="totalAppUsers"
      :perPage="getUserRequestBody.limit"
      @change="changePage"
      @change-per-page="changePerPage"
    />

    <ScrollToBtn :scrollRef="scrollRef" />
  </main>
</template>

<script lang="ts">
import { Ref } from 'vue';
import { USERSORT, User, UserSearchRequestBody } from '@/types/userTypes';
import { getUserTest } from '@/composables/appUsers';

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
    });

    const scrollRef = ref<HTMLElement | undefined>(undefined);

    const appUsers: Ref<User[]> = useAppUsers();
    const totalAppUsers: Ref<number> = useTotalAppUsers();

    const emailSearch = ref(true);
    const loading = ref(appUsers.value.length <= 0);
    const offset = useOffset();

    const getUserRequestBody = reactive(new UserSearchRequestBody());

    const userSearch = async () => {
      loading.value = true;
      await getUserTest(getUserRequestBody).then(() => {
        loading.value = false;
      }).catch((error) => {
        loading.value = false;
        throw new Error('Error in userSearch', error);
      })
    };

    const resetSearch = () => {
      getUserRequestBody.clearSearch();
      userSearch();
    };

    const currentPage = ref<number>(1);

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

    const options = [
      {
        label: 'Headings.None',
        value: USERSORT.NONE,
      },
      {
        label: 'Headings.UserEnabled',
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
      offset,
      totalAppUsers,
      emailSearch,
      getUserRequestBody,
      UserSearchRequestBody,
      userSearch,
      resetSearch,
      changePage,
      currentPage,
      changePerPage,
    };
  },
};
</script>
