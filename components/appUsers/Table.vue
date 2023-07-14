<template>
  <Table
    :data="data"
    :loading="isLoading"
    :headers="headers"
    @isMobile="isMobile = $event"
  >
    <template #display_name="{ item }">
      <div class="flex gap-2 md:gap-4 items-center">
        <img
          :src="item.avatar_url"
          alt=""
          class="h-5 w-5 md:h-10 md:w-10 object-contain rounded-full"
        />
        <div class="overflow-hidden w-full max-w-[325px]">
          <p class="truncate text-ellipsis text-body-2">
            {{ item.display_name }}
          </p>
          <p class="hidden md:block truncate text-ellipsis">
            {{ item.email }}
          </p>
        </div>
      </div>
    </template>

    <template #name="{ item }">
      <div class="overflow-hidden w-full max-w-[200px]">
        <p class="truncate text-ellipsis">
          {{ item.name }}
        </p>
      </div>
    </template>

    <template #admin="{ item }">
      <Chip
        :color="item.admin ? 'chip-color-2' : 'chip-color-1'"
        class="w-fit md:mx-auto"
      >
        {{ item.admin ? "Admin" : "User" }}
      </Chip>
    </template>

    <template #mfa_enabled="{ item }">
      <CheckIcon v-if="item.mfa_enabled" class="icon text-success" />
      <XMarkIcon v-else class="icon text-error" />
    </template>

    <template #email_verified="{ item }">
      <CheckIcon v-if="item.email_verified" class="icon text-success" />
      <XMarkIcon v-else class="icon text-error" />
    </template>

    <template #newsletter="{ item }">
      <CheckIcon v-if="item.newsletter" class="icon text-success" />
      <XMarkIcon v-else class="icon text-error" />
    </template>

    <template #enabled="{ item }">
      <CheckIcon v-if="item.enabled" class="icon text-success" />
      <XMarkIcon v-else class="icon text-error" />
    </template>

    <template #balance="{ item }">
      <p>{{ abbreviateNumber(item.balance) }}</p>
    </template>

    <template #xp="{ item }">
      <p>{{ abbreviateNumber(item.xp) }}</p>
    </template>

    <template #actions="{ item }">
      <div class="flex gap-3">
        <Icon
          @click="onclickDeleteUser(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="TrashIcon"
        />
        <Icon
          @click="onclickBanUser(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="NoSymbolIcon"
        />
        <Icon
          @click="onclickVerifyUser(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="CheckCircleIcon"
        />
        <Icon
          @click="onclickViewUser(item)"
          class="cursor-pointer"
          rounded
          sm
          :icon="EyeIcon"
        />
      </div>
    </template>
    <template #CanPost="{ item }">
      <div class="flex justify-center w-64">
        <InputCheckbox
          class="w-3"
          v-model="item.createBan"
          @click="fnBanFromPosting(item, 'CREATE')"
        />
      </div>
    </template>

    <template #CanReport="{ item }">
      <div class="flex justify-center w-64">
        <InputCheckbox
          class="w-3"
          v-model="item.reportBan"
          @click="fnBanFromReporting(item, 'REPORT')"
        />
      </div>
    </template>
  </Table>
</template>

<script lang="ts">
import { Ref, PropType } from "vue";
import { useI18n } from "vue-i18n";

import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  NoSymbolIcon,
  EyeIcon,
} from "@heroicons/vue/24/outline/index.js";

export default {
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    loading: { type: Boolean, default: true },
  },
  components: {
    CheckCircleIcon,
    XCircleIcon,
    XMarkIcon,
    CheckIcon,
    TrashIcon,
    NoSymbolIcon,
    EyeIcon,
  },
  setup(props) {
    const { t } = useI18n();

    const isLoading = computed(() => {
      return props.loading && props.data.length <= 0;
    });

    const isMobile = ref(false);

    const headers = computed(() => {
      let arrHeaders = [
        {
          label: "Headings.User",
          key: "display_name",
        },
        {
          label: "Headings.Nickname",
          key: "name",
        },
        {
          label: "Headings.Email",
          key: "email",
        },
        {
          label: "Headings.Role",
          key: "admin",
          class: "text-center",
        },
        {
          label: "Headings.Verified",
          key: "email_verified",
        },
        {
          label: "Headings.MFA",
          key: "mfa_enabled",
        },
        {
          label: "Headings.Newsletter",
          key: "newsletter",
        },
        {
          label: "Headings.Enabled",
          key: "enabled",
        },
        {
          label: "Headings.Balance",
          key: "balance",
        },
        {
          label: "Headings.XP",
          key: "xp",
        },
        {
          label: "Headings.BlockFromCreatingTasks",
          key: "CanPost",
          class: "text-center",
        },
        {
          label: "Headings.BlockFromReportingTasks",
          key: "CanReport",
          class: "text-center",
        },
        {
          label: "Headings.Actions",
          key: "actions",
          class: "text-center",
        },
      ];

      if (isMobile.value == true) {
        return arrHeaders;
      } else {
        arrHeaders.splice(2, 1);
        return arrHeaders;
      }
    });

    async function onclickDeleteUser(user: any) {
      openDialog(
        "warning",
        "Headings.DeleteUser",
        "Body.DeleteUser",
        false,
        {
          label: "Buttons.DeleteUser",
          onclick: async () => {
            setLoading(true);
            const [success, error] = await deleteAppUser(user.id);
            setLoading(false);

            success
              ? openSnackbar(
                  "success",
                  t("Success.DeleteUser", { placeholder: user?.name ?? "User" })
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

    async function onclickBanUser(user: any) {
      let status = !user.enabled;

      setLoading(true);
      const [success, error] = await setBanStatusOfAppUser(status, user.id);
      setLoading(false);

      success
        ? openSnackbar(
            "success",
            status
              ? t("Success.EnableUser", { placeholder: user?.name ?? "User" })
              : t("Success.BanUser", { placeholder: user?.name ?? "User" })
          )
        : openSnackbar("error", error?.detail ?? "");
    }

    const router = useRouter();
    const appUser = useAppUser();
    function onclickViewUser(user: any) {
      if (!!!user || !!!user.id) return;

      appUser.value = user;
      router.push(`/dashboard/users/${user.id}`);
    }

    async function onclickVerifyUser(user: any) {
      let isVerified = user.email_verified;

      setLoading(true);
      const [success, error] = await setEmailVerificationOfThisUser(
        user.id,
        !isVerified
      );
      setLoading(false);

      let newStatus = success?.email_verified ?? false;
      success
        ? openSnackbar(
            "success",
            newStatus
              ? `${user?.name ?? "User"} has been verified`
              : `${user?.name ?? "User"} has been un-verified`
          )
        : openSnackbar("error", error?.detail ?? "");
    }

    async function fnBanFromPosting(user: any, action: any) {
      if (user.createBan) {
        console.log("delete subtask creation ban", user.createBan);

        const [success, error] = await unbanAppUser(user.createSubtaskBan_id);
        if (success) {
          openSnackbar("success", "Success.BanDeleteForCreateSubtask");
          user.createBan = false;
        } else errorHandler(error);
      } else {
        console.log("createBan", user.createBan);
        const [success, error] = await banAppUser({
          user_id: user.id,
          action: action,
        });
        if (success) {
          openSnackbar("success", "Success.CreateBanForCreateSubtask");
          user.createSubtaskBan_id = success.id;
          user.createBan = true;
        } else errorHandler(error);
      }
    }

    async function fnBanFromReporting(user: any, action: any) {
      if (user.reportBan) {
        console.log("delete report ban", user.reportBan);

        const [success, error] = await unbanAppUser(user.reportBan_id);
        if (success) {
          openSnackbar("success", "Success.BanDeleteForReportSubtask");
          user.reportBan = false;
        } else errorHandler(error);
      } else {
        console.log("reportBan", user.reportBan);
        const [success, error] = await banAppUser({
          user_id: user.id,
          action: action,
        });
        if (success) {
          openSnackbar("success", "Success.CreateBanForReportSubtask");
          user.reportBan_id = success.id;
          user.reportBan = true;
        } else errorHandler(error);
      }
    }
    function errorHandler(error: any) {
      console.log("error in table error handler", error);
      openSnackbar("error", error);
    }
    return {
      isLoading,
      isMobile,
      headers,
      XMarkIcon,
      TrashIcon,
      NoSymbolIcon,
      EyeIcon,
      onclickDeleteUser,
      onclickBanUser,
      onclickViewUser,
      onclickVerifyUser,
      CheckCircleIcon,
      XCircleIcon,
      fnBanFromPosting,
      fnBanFromReporting,
    };
  },
};
</script>

<style scoped>
.icon {
  @apply h-5 w-5 md:mx-auto;
}
</style>
