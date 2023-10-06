<template>
  <Transition>
    <section
      v-if="modelValue"
      class="w-screen h-screen fixed left-0 top-0 z-50 bg-[#0b192edd] lg:w-full lg:h-full lg:relative"
      @click.self="closeMenu"
    >
      <NavbarLinks @closeMenu="closeMenu" class="links" />
    </section>
  </Transition>
</template>

<script>
export default {
  props: {
    modelValue: { default: "" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const windowWidth = ref(1440);
    const isScreenSM = ref(false);

    function closeMenu() {
      if (!isScreenSM.value) return;

      setTimeout(() => {
        emit("update:modelValue", false);
      }, 100);
    }

    function toggleMenu() {
      emit("update:modelValue", !props.modelValue);
    }

    onMounted(() => {
      window.addEventListener("resize", handleWindowResize);
      handleWindowResize();
    });

    onUnmounted(() => {
      window.removeEventListener("resize", handleWindowResize);
    });

    function handleWindowResize() {
      windowWidth.value = window?.innerWidth ?? 0;

      // for small screens, make navbar drawer absolute
      if (
        !!windowWidth.value &&
        windowWidth.value > 0 &&
        windowWidth.value <= 1024
      ) {
        isScreenSM.value = true;
      } else {
        isScreenSM.value = false;
        emit("update:modelValue", true);
      }
    }

    return {
      closeMenu,
      isScreenSM,
      toggleMenu,
    };
  },
};
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.links {
  animation: slide 0.5s ease-out 0.25s forwards;
  opacity: 0;
  transform: translateX(-100%);
}
@keyframes slide {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
