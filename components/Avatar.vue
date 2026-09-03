<template>
  <svg
    class="rounded-full bg-tertiary text-heading"
    viewBox="0 0 40 40"
    role="img"
    :aria-label="alt"
  >
    <text
      v-if="initials"
      x="20"
      y="20"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="16"
      font-weight="600"
      fill="currentColor"
    >
      {{ initials }}
    </text>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    // Display name the initials are taken from.
    name: { type: String, default: '' },
    // Alt text of the generated avatar.
    alt: { type: String, default: 'user avatar' },
  },
  setup(props) {
    const initials = computed(() => {
      const words = props.name.trim().split(/\s+/).filter(Boolean);
      if (!words.length) return '';

      const first = [...words[0]][0] ?? '';
      const last =
        words.length > 1 ? ([...words[words.length - 1]][0] ?? '') : '';
      return (first + last).toLocaleUpperCase();
    });

    return { initials };
  },
});
</script>

<style scoped></style>
