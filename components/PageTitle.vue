<template>
  <h1 class="text-heading-1">{{ t(pageTitle) }}</h1>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  setup() {
    const { t } = useI18n();

    const route = useRoute();

    const pageTitle = computed((): string => {
      let routeName = (<string>route?.name ?? "").toLocaleLowerCase();
      switch (routeName) {
      case "dashboard":
        return "Headings.Dashboard";
      case "dashboard-users":
        return "Headings.Users";
      case "dashboard-users-id":
        return "Headings.ManageUser";

      case "dashboard-skill-tree":
        return "Root Skills";
      case "dashboard-skill-tree-rootskill-sub-skills":
        return "Sub Skills";
      case "dashboard-skill-tree-create":
        return "Headings.CreateSubTree";
      case "dashboard-reported-tasks":
        return "Headings.ReportedTasks";
      case "dashboard-reported-tasks-id":
        return "Headings.ManageReport";
      case "dashboard-challenges":
        return "Headings.Challenges";
      case "dashboard-declarations":
        return "Headings.Declarations";

      default:
        return routeName;
      }
    });

    return { t, pageTitle };
  },
});
</script>

<style scoped></style>
