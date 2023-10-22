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
              ? 'inline-block px-4 py-3 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white'
              : 'inline-block px-4 py-3 text-white bg-blue-600 rounded-lg active'
          "
          @click="
            (emailSearch = true), (filters.email = ''), (filters.name = '', setFilters(filters))
          "
        >
          Email Search
        </button>
      </li>
      <li class="mr-2">
        <button
          :class="
            emailSearch
              ? 'inline-block px-4 py-3 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white'
              : 'inline-block px-4 py-3 text-white bg-blue-600 rounded-lg active'
          "
          @click="
            (emailSearch = false), (filters.email = ''), (filters.name = ''), setFilters(filters)
          "
        >
          Name Search
        </button>
      </li>
    </ul>
    <FormSearch
      class="mb-card-sm mt-card mt-0"
      :placeholder="emailSearch ? 'Search by Email' : 'Search by Name'"
      :modelValue="emailSearch ? filters.email : filters.name"
      @update:modelValue="
        (newValue) => {
          if (emailSearch) {
            filters.email = newValue;
          } else {
            filters.name = newValue;
          }
        }
      "
      @search="
        emailSearch
          ? setFilters({ email: filters.email })
          : setFilters({ name: filters.name })
      "
    />

    <Sort
      text="Headings.FilterBy"
      class="mb-card"
      :options="options"
      :quantity="appUsers.length"
      @selected="onSelectedOption($event)"
    />

    <AppUsersTable :data="appUsers" :loading="loading" />

    <Btn
      secondary
      class="mx-auto mt-card"
      @click="onclickLoadMore"
      :class="{
        'pointer-events-none opacity-70':
          loading || appUsers.length >= totalAppUsers,
      }"
    >
      <template v-if="loading">
        <span class="mr-2">Loading</span>
        <LoadingCircular />
      </template>

      <span v-else-if="appUsers.length < totalAppUsers">Load More</span>

      <span v-else>No more users</span>
    </Btn>

    <ScrollToBtn :scrollRef="scrollRef" />
  </main>
</template>

<script lang="ts">
import { Ref } from 'vue';
import { User, UserFilter } from '@/types/userTypes';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

export default {
  head: {
    title: 'Users',
  },
  setup() {
    const scrollRef = ref<HTMLElement | undefined>(undefined);

    const appUsers: Ref<User[]> = useAppUsers();
    const totalAppUsers: Ref<number> = useTotalAppUsers();

    const emailSearch = ref(true);

    const loading = ref(appUsers.value.length <= 0);

    const offset = useOffset();
    const limit = useLimit();

    const cookie_filters = <any>useCookie('users_filter');
    const filters = reactive(
      cookie_filters.value ?? {
        email: '',
        enabled: false,
        admin: false,
        mfa_enabled: false,
        email_verified: false,
        newsletter: false,
      }
    );
 
    async function setFilters(paramFilters: UserFilter) {
      Object.assign(filters, {
        ...filters,
        ...paramFilters,
      });

      cookie_filters.value = JSON.stringify(filters);

      loading.value = true;
      await getAppUsers(filters);
      loading.value = false;
      
      appUsers.value = await Promise.all(
        appUsers.value.map(async (user: any) => {
          let balance = user?.balance ?? null;
          if (balance == null) {
            const [success, error] = await getBalanceOfThisUser(user.id);
            balance = success?.coins ?? 0;
          }

          let xp = user?.xp ?? 0;
          if (!!!balance) {
            const [success, error] = await getXPOfThisUser(user.id);
            xp = success?.total_xp ?? 0;
          }

          return {
            ...user,
            balance: balance,
            xp: xp,
          };
        })
      );
    }

    const options = [
      {
        label: 'Headings.None',
        value: 'none',
      },
      {
        label: 'Headings.Enabled',
        value: 'enabled',
      },
      {
        label: 'Headings.Admin',
        value: 'admin',
      },
      {
        label: 'Headings.MFA',
        value: 'mfa_enabled',
      },
      {
        label: 'Headings.Verified',
        value: 'email_verified',
      },
      {
        label: 'Headings.Newsletter',
        value: 'newsletter',
      },
    ];

    function onSelectedOption(option: string) {
      setFilters({
        enabled: option == 'enabled',
        admin: option == 'admin',
        mfa_enabled: option == 'mfa_enabled',
        email_verified: option == 'email_verified',
        newsletter: option == 'newsletter',
      });
    }

    async function onclickLoadMore() {
      offset.value = offset.value + limit.value;
      await setFilters(filters);
    }

    return {
      loading,
      appUsers,
      setFilters,
      filters,
      onSelectedOption,
      options,
      scrollRef,
      onclickLoadMore,
      offset,
      totalAppUsers,
      emailSearch,
    };
  },
};
</script>
