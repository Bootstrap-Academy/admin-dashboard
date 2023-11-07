<template>
	<svg
		class="absolute left-0 top-0"
		:style="{
			height: `${height}px`,
			width: `${width}px`,
		}"
	>
		<g v-for="pathway of pathways" :key="pathway">
			<path
				:id="pathway"
				:d="pathway"
				:stroke-width="4"
				class="transition-all duration-200 ease-out origin-bottom stroke-secondary hover:stroke-accent"
			/>
			<defs>
				<marker
					id="arrowhead"
					:markerWidth="triangle.markerWidth"
					:markerHeight="triangle.markerHeight"
					:refX="triangle.refX"
					:refY="triangle.refY"
					orient="auto"
				>
					<polygon :points="triangle.points" class="fill-secondary" />
				</marker>
				<marker
					id="hover-arrowhead"
					:markerWidth="triangle.markerWidth"
					:markerHeight="triangle.markerHeight"
					:refX="triangle.refX"
					:refY="triangle.refY"
					orient="auto"
				>
					<polygon :points="triangle.points" class="fill-accent" />
				</marker>
			</defs>
		</g>
	</svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
	props: {
		height: { type: Number, default: 0 },
		width: { type: Number, default: 0 },
		cellSize: { type: Number, default: 0 },
		skills: { type: Array as PropType<any[]>, default: [] },
	},
	setup(props) {
		const pathways = computed(() => {
			let arr: any[] = [];

			props.skills.forEach((skill) => {
				let dependencies: string[] = skill?.dependencies ?? [];

				let x1 = getGridCoord(skill.row);
				let y1 = getGridCoord(skill.column);

				dependencies.forEach((dependencyID) => {
					let dependency = props.skills.find((s) => s.id == dependencyID);

					if (!!!dependency) return;

					let x2 = getGridCoord(dependency.row);
					let y2 = getGridCoord(dependency.column);

					arr.push(`M${x1} ${y1} L${x2} ${y2}`);
				});
			});
			return arr;
		});

		function getGridCoord(val: number) {
			let cellHalf = props.cellSize * 0.5;
			return val * props.cellSize + cellHalf;
		}

		const triangle = reactive({
			markerWidth: 3,
			markerHeight: 3,
			refX: -10,
			refY: 1.5,
			points: '3 0, 3 3, 0 1.5',
		});

		return { pathways, triangle };
	},
});
</script>

<style scoped>
path {
	marker-start: url('#arrowhead');
}
path:hover {
	marker-start: url('#hover-arrowhead');
}
</style>
