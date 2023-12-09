<template>
  <section>
    <p class="text-accent">{{t('Body.codingChallengeInfo')}}</p>
    <p class="text-3xl mt-14 mb-3 text-white">
      {{ t("Headings.CodingChallenge") }}
    </p>
    <p>
      <span> {{ t("Headings.Description") }}: </span
      >{{ codingChallenge?.description ?? "" }}
    </p>
    <p>
      <span> {{ t("Headings.Morphcoins") }}: </span
      >{{ codingChallenge?.fee ?? "" }}
    </p>
    <p>
      <span> {{ t("Headings.Fee") }}: </span>{{ codingChallenge?.coins ?? "" }}
    </p>
    <p>
      <span> {{ t("Headings.Xp") }}: </span>{{ codingChallenge?.xp ?? "" }}
    </p>

    <p class="text-2xl mt-6 mb-2 text-white">
      {{ t("Headings.SolutionCode") }}
    </p>
    <p>
      {{ codingChallengeSolution?.code ?? "" }}
    </p>

    <p class="text-2xl mt-6 mb-2 text-white">
      {{ t("Headings.SolutionEnvironment") }}
    </p>
    <p>
      {{ codingChallengeSolution?.environment ?? "" }}
    </p>
  </section>
</template>

<script lang="ts">
import { useI18n } from "vue-i18n";
export default {
  props: {
    codingChallenge: { type: Object, default: null },
    codingChallengeSolution: { type: Object, default: null },
  },
  setup() {
    const { t } = useI18n();

    return { t };
  },
};
</script>

<style scoped></style>
