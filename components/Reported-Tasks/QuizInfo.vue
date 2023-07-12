<template>
  <div>
    <p class="text-3xl mt-14 mb-3 text-white">{{ t("Headings.Quiz") }}</p>
    <p>
      <span> {{ t("Headings.Question") }}: </span>{{ mcq?.question ?? "" }}
    </p>
    <p class="text-2xl mt-6 mb-2 text-white">{{ t("Headings.Options") }}</p>

    <p
      :class="answer.correct ? 'bg-success' : 'bg-error'"
      class="flex gap-3 py-2 text-white text-2xl px-3 mb-3"
      v-for="(answer, i) of mcq?.answers"
      :key="i"
    >
      <span class="h-10 w-10">
        <CheckIcon
          v-if="answer?.answer == true"
          class="max-h-[32px] max-w-[32px]"
        />
        <XMarkIcon v-else class="max-h-[32px] max-w-[32px]" />
      </span>

      {{ answer?.answer ?? "" }}
    </p>
  </div>
</template>

<script lang="ts">
import {
  ExclamationCircleIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import { useI18n } from "vue-i18n";
export default {
  components: { ExclamationCircleIcon, XMarkIcon, CheckIcon },
  props: {
    mcq: { type: Object, default: null },
  },
  setup() {
    const { t } = useI18n();
    return { t, ExclamationCircleIcon, XMarkIcon, CheckIcon };
  },
};
</script>

<style scoped></style>
