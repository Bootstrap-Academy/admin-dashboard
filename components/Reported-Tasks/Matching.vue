<template>
	<div class="flex flex-col justify-center text-center gap-3">
		<!-- Todo: Matching Component -->
        <!-- AddLocale: MatchingSolution -->
		<h2 class="text-accent text-3xl">Matching Solution</h2>
		<div class="flex justify-evenly">
			<div class="text-center">
				<!-- AddLocale: Linke Seite -->
				<h3>Linke Seite</h3>
				<p v-for="(item, index) in reportedMatching.left" :key="index">{{ item }}</p>
			</div>
            <div class="text-center">
                <!-- AddLocale: Rechte Seite -->
                <h3>Rechte Seite</h3>
                <p v-for="(solution, index) in reportedMatching.solution">{{ reportedMatching.right[solution] }}</p>
            </div>
		</div>
	</div>
</template>

<script setup lang="ts">
	const reportedMatching = useMatching();
</script>

<style scoped></style>
