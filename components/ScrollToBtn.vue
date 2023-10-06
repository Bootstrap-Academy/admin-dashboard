<template>
  <ArrowUpCircleIcon
    @click="onclickScrollUp"
    class="fixed z-50 right-card bottom-card w-14 h-14 text-accent cursor-pointer bg-primary rounded-full"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { ArrowUpCircleIcon } from "@heroicons/vue/24/solid/index.js";

export default defineComponent({
  components: { ArrowUpCircleIcon },
  props: {
    scrollRef: { type: Object as PropType<HTMLElement>, default: null },
  },
  setup(props) {
    function onclickScrollUp() {
      if (!!!props.scrollRef) return;
      props.scrollRef.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
    return { onclickScrollUp };
  },
});
</script>

<style scoped></style>
