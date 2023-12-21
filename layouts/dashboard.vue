<template>
	<div class="dashboard-layout">
		<Language color="bg-accent" dashboard />

		<Navbar />

		<section
			class="max-h-full h-full overflow-y-scroll px-dashboard py-dashboard"
		>
			<slot />
		</section>
	</div>
</template>

<script>
export default {
  setup() {},
};
</script>

<style scoped>
.dashboard-layout {
	width: 100vw;
	height: 100vh;
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	grid-template-rows: auto auto 1fr;
	grid-template-areas:
		'Language'
		'Navbar'
		'Slot';
}
.dashboard-layout > *:nth-child(1) {
	grid-area: Language;
}
.dashboard-layout > *:nth-child(2) {
	grid-area: Navbar;
}
.dashboard-layout > *:nth-child(3) {
	grid-area: Slot;
}
@media screen and (min-width: 1024px) {
	.dashboard-layout {
		grid-template-columns: 300px 1fr;
		grid-template-rows: auto 1fr;
		grid-template-areas:
			'Language Language'
			'Navbar Slot';
	}
}
</style>
