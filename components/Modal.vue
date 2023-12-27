<template>
	<section
		class="pb-container fixed z-50 left-0 top-0 w-screen h-screen overflow-hidden bg-[#0b192edd]"
	>
		<Language class="h-[33px]" />

		<div
			class="flex flex-col justify-center h-full gap-40 items-center modal-content"
			@click.self="emit('backdrop', true)"
		>
			<slot></slot>
		</div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  emit: ['backdrop'],
  setup(props, { emit }) {
    return { emit };
  },
});
</script>

<style scoped>
.modal-content {
	animation: modalContent 0.75s ease-out forwards;
}

@keyframes modalContent {
	0% {
		opacity: 0;
		transform: translateY(30px);
	}
	100% {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
