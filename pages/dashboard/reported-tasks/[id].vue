<template>
  <div>
    <p>Messaeg from reportrer</p>
  </div>
</template>

<script lang="ts">
definePageMeta({
  middleware: ["auth"],
  layout: "dashboard",
});
export default {
  setup() {
    // onMounted(() => {});
    return {};
  },
};
</script>

<style scoped></style>
