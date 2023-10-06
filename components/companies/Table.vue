<template>
  <Table :data="data" :loading="isLoading" :headers="headers">
    <template #name="{ item }">
      <div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
        <img
          :src="item?.logo_url ?? ''"
          alt=""
          class="h-5 w-5 md:h-10 md:w-10 object-contain rounded-full"
        />
        <p class="clamp line-1 text-body-2">
          {{ item?.name ?? "" }}
        </p>
      </div>
    </template>

    <template #description="{ item }">
      <p class="clamp line-2 max-w-xl w-full">
        {{ item?.description ?? "" }}
      </p>
    </template>

    <template #website="{ item }">
      <a :href="item.website" target="_blank" v-if="item.website">
        <ArrowTopRightOnSquareIcon class="icon text-success" />
      </a>
    </template>

    <template #instagram_handle="{ item }">
      <a
        :href="item.instagram_handle"
        target="_blank"
        v-if="item.instagram_handle"
        class="pl-extra"
      >
        <IconInstagram class="icon fill-[#d62976]" />
      </a>
    </template>

    <template #twitter_handle="{ item }">
      <a :href="item.twitter_handle" target="_blank" v-if="item.twitter_handle">
        <IconTwitter class="icon fill-[#00acee]" />
      </a>
    </template>

    <template #youtube_video="{ item }">
      <a :href="item.youtube_video" target="_blank" v-if="item.youtube_video">
        <IconYoutube class="icon fill-[#FF0000]" />
      </a>
    </template>

    <template #actions="{ item }">
      <div class="flex gap-3">
        <Icon
          @click="onclickDeleteItem(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="TrashIcon"
        />
        <Icon
          @click="onclickEditItem(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="PencilIcon"
        />
      </div>
    </template>
  </Table>
</template>

<script lang="ts">
import { Ref, PropType } from "vue";
import { useI18n } from "vue-i18n";

import {
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/vue/24/outline/index.js";
import IconInstagram from "~/components/icon/Instagram.vue";
import IconTwitter from "~/components/icon/Twitter.vue";
import IconYoutube from "~/components/icon/Youtube.vue";

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
    IconInstagram,
    IconTwitter,
    IconYoutube,
  },
  setup(props) {
    const { t } = useI18n();

    const isLoading = computed(() => {
      return props.loading && props.data.length <= 0;
    });

    const headers = computed(() => {
      let arrHeaders = [
        {
          label: "Name",
          key: "name",
        },
        {
          label: "Description",
          key: "description",
        },
        {
          label: "Website",
          key: "website",
        },
        {
          label: "Instagram",
          key: "instagram_handle",
        },
        {
          label: "Twitter",
          key: "twitter_handle",
        },
        {
          label: "Youtube",
          key: "youtube_video",
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
          onclick: async () => {
            setLoading(true);
            const [success, error] = await deleteCompany(item.id);
            setLoading(false);

            success
              ? openSnackbar(
                  "success",
                  `Deleted ${item?.name ?? "this"} company successfully`
                )
              : openSnackbar("error", error?.detail ?? "");
          },
        },
        {
          label: "Buttons.Cancel",
          onclick: () => {},
        }
      );
    }

    const router = useRouter();
    const company = useCompany();

    function onclickEditItem(item: any) {
      if (!!!item || !!!item.id) return;

      company.value = item;
      router.push(`/dashboard/companies/${item.id}`);
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
