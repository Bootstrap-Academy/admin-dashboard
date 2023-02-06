<template>
	<div class="h-full links">
		<section
			class="px-dashboard py-3 flex lg:hidden items-center justify-between lg:justify-end bg-tertiary"
		>
			<div class="flex items-center gap-3">
				<img src="/images/logo.png" class="w-8 h-auto object-contain" alt="" />
				<h6
					class="w-fit italic px-2 py-0.5 bg-info rounded text-white font-heading text-heading-5"
				>
					Admin
				</h6>
			</div>
			<Icon
				class="cursor-pointer block lg:hidden"
				:icon="Bars3Icon"
				@click="toggleMenu"
				bgColor="bg-primary"
			/>
		</section>

		<NavbarDrawer v-model="show" />
	</div>
</template>

<script>
import { Bars3Icon } from '@heroicons/vue/24/solid/index.js';

export default {
	components: { Bars3Icon },
	setup() {
		const show = ref(true);

		function toggleMenu() {
			show.value = !show.value;
		}

		return { show, toggleMenu, Bars3Icon };
	},
};
</script>

<style scoped></style>
