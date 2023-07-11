<template>
  <div>
    <Table :data="data" :loading="isLoading" :headers="headers">
      <template #reportedBy="{ item }">
        <div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
          <p class="clamp line-1 text-body-2">
            {{ item?.userName ?? "" }}
          </p>
        </div>
      </template>

      <template #reportedAt="{ item }">
        <div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
          <p class="clamp line-1 text-body-2">
            {{ item?.timestamp ?? "" }}
          </p>
        </div>
      </template>

      <template #comment="{ item }">
        <div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
          <p class="clamp line-1 text-body-2">
            {{ item?.comment ?? "" }}
          </p>
        </div>
      </template>

      <template #reason="{ item }">
        <chip class="w-fit">
          {{ item?.reason ?? "" }}
        </chip>
      </template>

      <template #actions="{ item }">
        <div class="flex gap-3">
          <Icon
            @click="onclickEditItem(item)"
            class="cursor-pointer"
            rounded
            sm
            :icon="EyeIcon"
          />
        </div>
      </template>
    </Table>
  </div>
</template>

<script lang="ts">
import { EyeIcon } from "@heroicons/vue/24/outline/index.js";
import { computed, PropType } from "vue";
import { openDialog } from "../../composables/response";
export default {
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    loading: { type: Boolean, default: true },
  },

  components: {
    EyeIcon,
  },
  setup(props) {
    const isLoading = computed(() => {
      return props.loading && props.data.length <= 0;
    });

    const headers = computed(() => {
      let arrHeaders = [
        {
          label: "Headings.ReportedBy",
          key: "userName",
        },
        {
          label: "Headings.ReportedAt",
          key: "",
        },
        {
          label: "Headings.Comment",
          key: "comment",
        },
        {
          label: "Headings.Reason",
          key: "reason",
        },
        {
          label: "Headings.Actions",
          key: "actions",
          class: "text-center",
        },
      ];

      return arrHeaders;
    });

    async function onclickDeleteItem(item: any) {
      openDialog(
        "warning",
        "Delete Company",
        "Are you sure you want to delete company? This action cannot be undone.",
        false,
        {
          label: "Yes, Delete Company",
          onclick: async () => {},
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    const router = useRouter();

    function onclickEditItem(item: any) {
      if (!!!item || !!!item.id) return;

      router.push(`/dashboard/reported-tasks/${item.id}`);
    }

    return {
      headers,
      onclickDeleteItem,
      onclickEditItem,
      isLoading,
      EyeIcon,
    };
  },
};
</script>

<style scoped></style>
<!-- 


 -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
<!--  -->
