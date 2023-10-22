<template>
	<main class="relative overflow-scroll">
		<Head>
			<Title>Manage Skill Tree - {{ rootSkillName }}</Title>
		</Head>

		<header
			class="flex gap-card items-center w-fit container-fluid pt-card pb-card"
		>
			<h1 class="text-heading-2 capitalize">
				{{ rootSkillName }}
			</h1>

			<Btn sm secondary @click="showControls = !showControls">
				Toggle Controls
			</Btn>
		</header>

		<section
			v-if="skillTree"
			class="relative mx-auto"
			:style="{
				height: `${gridHeight}px`,
				width: `${gridWidth}px`,
			}"
		>
			<!-- grid -->

			<SkillTreePathways
				:skills="skills"
				:height="gridHeight"
				:width="gridWidth"
				:cellSize="cellSize"
			/>

			<template v-if="showGrid">
				<template v-for="col in totalColumns - 1" :key="`col-${col}`">
					<div
						v-for="row in totalRows - 1"
						:key="`row-${row}`"
						class="border absolute"
						:style="{
							top: `${(col - 1) * cellSize}px`,
							left: `${(row - 1) * cellSize}px`,
							width: `${cellSize}px`,
							height: `${cellSize}px`,
						}"
						:class="{
							'bg-tertiary': col - 1 == selectedCol && row - 1 == selectedRow,
						}"
						@click="onclickCreateNewSkill(row, col)"
					></div>
				</template>
			</template>

			<template v-for="skill of skills" :key="skill.id">
				<img
					:src="`/svgs/${skill.icon}.svg`"
					alt=""
					class="object-contain absolute cursor-move"
					:style="{
						top: `${skill.column * cellSize + cellGap}px`,
						left: `${skill.row * cellSize + cellGap}px`,
						width: `${cellSize - 2 * cellGap}px`,
						height: `${cellSize - 2 * cellGap}px`,
					}"
					@mouseover.prevent="startDraggingProcess($event, skill)"
					draggable="false"
				/>
			</template>
		</section>

		<SkillTreeAside
			@showGrid="showGrid = $event"
			:isRoot="isRoot"
			:skillTree="skillTree"
			:selectedSkill="selectedSkill"
			:selectedCol="selectedCol"
			:selectedRow="selectedRow"
			:rootSkillID="rootSkillID"
			:subSkillID="subSkillID"
			:showControls="showControls"
		/>
	</main>
</template>

<script lang="ts">
import { ComputedRef, Ref } from 'vue';
definePageMeta({
	middleware: ['auth'],
});

export default {
	head: {
		title: 'Manage Skill Tree - ',
	},
	setup() {
		const route = useRoute();
		const router = useRouter();

		// ! ==================================================================== Skill Tree
		const isRoot = computed(() => {
			return rootSkillID.value == 'root';
		});

		const rootSkillID = computed(() => {
			return <string>(route?.params?.rootSkill ?? '');
		});

		const rootSkillName = computed(() => {
			return rootSkillID.value.replace(/_/g, ' ');
		});

		const skillTree: Ref<any> = useSkillTree();

		const skills: ComputedRef<any[]> = computed(() => {
			return skillTree.value?.skills ?? [];
		});

		// ! ==================================================================== Selected Skill Data
		const subSkillID = computed({
			get() {
				return <string>(route?.query?.subSkillID ?? '');
			},
			set(value: string) {
				if (!!!value) return;

				router.replace({
					path: route.path,
					query: !!value ? { subSkillID: value } : undefined,
				});
			},
		});

		const selectedSkill = computed(() => {
			return skills.value.find((skill) => skill.id == subSkillID.value);
		});

		const selectedCol = ref(0);
		const selectedRow = ref(0);

		// ! ==================================================================== Grid
		const totalRows: ComputedRef<number> = computed(() => {
			return skillTree.value?.rows ?? 0;
		});

		const totalColumns: ComputedRef<number> = computed(() => {
			return skillTree.value?.columns ?? 0;
		});

		const cellGap = 10;
		const cellSize = 100;

		const gridWidth = computed(() => {
			return (totalRows.value - 1) * cellSize;
		});
		const gridHeight = computed(() => {
			return (totalColumns.value - 1) * cellSize;
		});

		function onclickCreateNewSkill(row: number, column: number) {
			// clear selected sub skill id from URL
			router.replace({
				path: route.path,
				query: undefined,
			});

			selectedRow.value = row - 1;
			selectedCol.value = column - 1;

		}

		// ! ==================================================================== Drag Skill
		const pos1 = ref(0);
		const pos2 = ref(0);
		const pos3 = ref(0);
		const pos4 = ref(0);

		let localSelectedSkill: any = null;

		function startDraggingProcess(event: any, skill: any) {
			event.target.onmousedown = grabElement;
			localSelectedSkill = skill;
		}

		function grabElement(event: any) {
			event = event || window.event;

			pos3.value = event.clientX;
			pos4.value = event.clientY;

			event.target.onmouseup = releaseElement;
			event.target.onmousemove = dragElement;

			subSkillID.value = localSelectedSkill.id;
			selectedCol.value = localSelectedSkill.column;
			selectedRow.value = localSelectedSkill.row;
		}

		function dragElement(event: any) {
			event = event || window.event;
			pos1.value = pos3.value - event.clientX;
			pos2.value = pos4.value - event.clientY;
			pos3.value = event.clientX;
			pos4.value = event.clientY;
			// set the element's new position:
			event.target.style.top = event.target.offsetTop - pos2.value + 'px';
			event.target.style.left = event.target.offsetLeft - pos1.value + 'px';
		}

		function releaseElement(event: any) {
			/* stop moving when mouse button is released:*/
			event.target.onmouseup = null;
			event.target.onmousemove = null;

			let top = getFinalPosition(event.target.offsetTop);
			let left = getFinalPosition(event.target.offsetLeft);

			event.target.style.top = top.style;
			event.target.style.left = left.style;

			selectedCol.value = top.grid;
			selectedRow.value = left.grid;

			skillTree.value.skills = skillTree.value.skills.map((skill: any) => {
				return skill.id == subSkillID.value
					? { ...skill, column: top.grid, row: left.grid }
					: { ...skill };
			});
		}

		function getFinalPosition(currentVal: number) {
			let roundedVal = Math.floor(currentVal / 100) * 100;
			let difference = currentVal - roundedVal;
			let finalVal = difference <= 50 ? roundedVal : roundedVal + cellSize;

			let style = finalVal + cellGap + 'px';
			let grid = parseInt(finalVal.toString().replace(/^0+|0+$/g, ''));

			let lengthOfFinalVal = (finalVal ?? 0).toString().length;
			let lengthOfGrid = (grid ?? 0).toString().length;

			if (lengthOfGrid == 1) {
				if (lengthOfFinalVal == 4) {
					grid = parseInt(`${grid}0`);
				} else if (lengthOfFinalVal == 5) {
					grid = parseInt(`${grid}00`);
				}
			}

			return {
				style: style,
				grid: grid,
			};
		}

		// ! ==================================================================== Skill Tree Settings
		const showGrid = ref(true);
		const cookie_showControls = useCookie<boolean>('showControls');
		const showControls = computed({
			get() {
				return cookie_showControls.value || false;
			},
			set(data: boolean) {
				cookie_showControls.value = data;
			},
		});

		// ! ==================================================================== Starting Point
		const loading = ref(true);

		onMounted(async () => {
			// getting skill tree
			await getSkillTreeByRootID(rootSkillID.value);
			loading.value = false;

			// if theres already a selected skill, use their current col and row #
			if (!!selectedSkill.value) {
				selectedCol.value = selectedSkill.value.column ?? 0;
				selectedRow.value = selectedSkill.value.row ?? 0;
			}
		});

		return {
			// Skill Tree Data
			isRoot,
			rootSkillID,
			rootSkillName,
			skillTree,
			skills,

			// Selected Skill Data
			subSkillID,
			selectedSkill,
			selectedCol,
			selectedRow,

			// Grid Data
			totalRows,
			totalColumns,
			onclickCreateNewSkill,
			cellSize,
			cellGap,
			gridWidth,
			gridHeight,

			// Drag Skill
			grabElement,
			releaseElement,
			dragElement,
			startDraggingProcess,

			// Skill Tree Settings
			showGrid,
			showControls,
		};
	},
};
</script>

<style scoped></style>
