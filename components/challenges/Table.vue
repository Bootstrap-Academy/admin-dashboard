<template>
  <Table :data="data" :loading="isLoading" :headers="headers">
    <template #title="{ item }">
      <div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
        <p class="clamp line-1 text-body-2">
          {{ item?.title ?? "" }}
        </p>
      </div>
    </template>

    <template #description="{ item }">
      <p class="clamp line-2 max-w-xl w-full">
        {{ item?.description ?? "" }}
      </p>
    </template>

    <template #actions="{ item }">
      <div class="flex gap-3 justify-center">
        <Icon @click="onclickDeleteItem(item)" class="cursor-pointer" rounded sm :icon="TrashIcon" />
        <Icon @click="onclickEditItem(item)" class="cursor-pointer" rounded sm :icon="PencilIcon" />
      </div>
    </template>
  </Table>
</template>

<script lang="ts">
import type { Ref, PropType } from "vue";
import { useI18n } from "vue-i18n";

import {
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/vue/24/outline/index.js";

export default {
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    loading: { type: Boolean, default: true },
  },
  components: {
    ArrowTopRightOnSquareIcon,
    XMarkIcon,
    TrashIcon,
    PencilIcon,
  },
  setup(props) {
    const { t } = useI18n();

    const isLoading = computed(() => {
      return props.loading && props.data.length <= 0;
    });

    const headers = computed(() => {
      let arrHeaders = [
        {
          label: "Headings.Title",
          key: "title",
        },
        {
          label: "Headings.Description",
          key: "description",
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
        "Dialogs.DeleteChallengeHeading",
        "Dialogs.DeleteChallengeBody",
        false,
        {
          label: "Dialogs.DeleteChallengeButton",
          onclick: async () => {
            setLoading(true);
            const [success, error] = await deleteChallengeCategory(item.id);
            setLoading(false);

            success
              ? openSnackbar(
                "success",
                "Dialogs.DeleteChallengeConfirmation"
              )
              : openSnackbar("error", error?.detail ?? "");
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => { },
        }
      );
    }

    const router = useRouter();
    const challenge = useCodingChallenge();

    function onclickEditItem(item: any) {
      if (Boolean(!item) || Boolean(!item.id)) return;

      challenge.value = item;
      router.push(`/dashboard/challenges/${item.id}`);
    }

    return {
      isLoading,
      headers,
      XMarkIcon,
      TrashIcon,
      PencilIcon,
      onclickDeleteItem,
      onclickEditItem,
    };
  },
};
</script>

<style scoped>
a {
  @apply block w-fit pl-4 cursor-pointer;
}

a.pl-extra {
  @apply pl-6;
}

.icon {
  @apply h-6 w-6 md:h-7 md:w-7;
}
</style>
