<script setup lang="ts">
definePageMeta({ layout: "dashboard" });
const route = useRoute();
onMounted(() =>
  navigateTo(
    `/dashboard/moderation/${encodeURIComponent(String(route.params.id))}?owner=challenges`,
    { replace: true },
  ),
);
</script>
<template>
  <p>Der dauerhafte Vorgang mit der exakten Teilaufgaben-ID wird geladen.</p>
</template>
