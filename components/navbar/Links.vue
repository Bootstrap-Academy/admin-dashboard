<template>
  <aside
    class="h-full w-72 lg:w-full bg-tertiary card shadow-2xl lg:shadow-none grid grid-rows-[auto_1fr_auto]"
  >
    <NuxtLink to="/" class="flex gap-box items-center">
      <img
        src="/images/logo-text.png"
        alt="bootstrap academy logo"
        class="object-contain w-36 cursor-pointer"
      />
      <h6
        class="w-fit mt-2 italic px-2 py-0.5 bg-info rounded text-white font-heading text-heading-5"
      >
        Admin
      </h6>
    </NuxtLink>

    <nav class="mt-12 flex flex-col gap-8">
      <NuxtLink
        v-for="({ name, icon, label, pathname }, i) of links"
        :key="i"
        :to="pathname"
        :data-commercial-nav="name === 'dashboard-commercial' ? '' : undefined"
        class="h-fit px-4 py-3 rounded"
        @click.prevent="emit('closeMenu', true)"
        :class="{
          'active-link': activePathName == name,
        }"
      >
        <IconText
          lg
          :icon="icon"
          :fill="
            activePathName == name
              ? name === 'dashboard-commercial'
                ? 'fill-dark'
                : 'fill-white'
              : 'fill-accent'
          "
          :iconColor="
            activePathName == name
              ? name === 'dashboard-commercial'
                ? 'text-dark'
                : 'text-white'
              : 'text-accent'
          "
          :labelColor="
            name === 'dashboard-commercial'
              ? activePathName == name
                ? 'text-dark'
                : 'text-body'
              : activePathName == name
                ? 'text-white'
                : 'text-subheading'
          "
        >
          {{ t(label) }}
        </IconText>
      </NuxtLink>
    </nav>

    <Btn full @click="logout">{{ t("Buttons.Logout") }}</Btn>
  </aside>
</template>

<script>
import { useI18n } from "vue-i18n";
import { logout } from "~~/composables/auth";
import {
  Squares2X2Icon,
  UsersIcon,
  BookOpenIcon,
  TrophyIcon,
  DocumentTextIcon,
} from "@heroicons/vue/24/solid/index.js";
import IconSkillTree from "~/components/icon/SkillTree.vue";

export default {
  components: {
    Squares2X2Icon,
    UsersIcon,
    IconSkillTree,
    BookOpenIcon,
    TrophyIcon,
    DocumentTextIcon,
  },
  emits: ["closeMenu"],
  setup(props, { emit }) {
    const { t } = useI18n();

    const links = shallowRef([
      {
        name: "dashboard-commercial",
        icon: DocumentTextIcon,
        label: "Links.Commercial",
        pathname: "/dashboard/commercial",
      },
      {
        name: "dashboard-moderation",
        icon: DocumentTextIcon,
        label: "Links.Moderation",
        pathname: "/dashboard/moderation",
      },
      {
        name: "dashboard",
        icon: Squares2X2Icon,
        label: "Links.Dashboard",
        pathname: "/dashboard",
      },
      {
        name: "dashboard-users",
        icon: UsersIcon,
        label: "Links.Users",
        pathname: "/dashboard/users",
      },
      {
        name: "dashboard-skill-tree",
        icon: IconSkillTree,
        label: "Links.SkillTree",
        pathname: "/dashboard/skill-tree",
      },
      {
        name: "dashboard-reported-tasks",
        icon: BookOpenIcon,
        label: "Links.ReportedTasks",
        pathname: "/dashboard/reported-tasks",
      },
      {
        name: "dashboard-challenges",
        icon: TrophyIcon,
        label: "Links.Challenges",
        pathname: "/dashboard/challenges",
      },
      {
        name: "dashboard-declarations",
        icon: DocumentTextIcon,
        label: "Links.Declarations",
        pathname: "/dashboard/declarations",
      },
    ]);

    const route = useRoute();
    const activePathName = computed(() => {
      return route.name;
    });

    return { t, links, activePathName, emit, logout };
  },
};
</script>

<style scoped>
.active-link {
  background-color: var(--color-accent);
}

.active-link > * {
  color: var(--color-white) !important;
  fill: var(--color-white) !important;
}
a[data-commercial-nav]:focus-visible {
  outline: 3px solid var(--color-heading);
  outline-offset: 3px;
}
</style>
