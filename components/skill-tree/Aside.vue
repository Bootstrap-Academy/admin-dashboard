<!--
❌ Responsive UI
✅ Page Title
❌ Translation
❌ Animation
✅ middleware

❌ Tested on chrome
❌ Tested on firefox
❌ Tested on safari
❌ Tested on android mobile
❌ Tested on apple mobile

❌ Handle loading if data already exists
❌ Handle loading if data is empty
❌ Display data
❌ Handle empty state

❌ Recaptcha
❌ Preset Form
❌ Api implemented
❌ Form Client Side Error Handling
❌ Form Submission Process
❌ Form Post Api Error Handling + ❌ Translation
❌ Form Post Api Success Handling + ❌ Translation
-->

<template>
	<Transition>
		<aside
			v-if="showControls"
			class="style-card border-2 border-tertiary fixed right-card overflow-hidden bg-primary max-w-md w-full"
		>
			<h2 class="text-heading-3 card py-4 bg-tertiary text-center w-full">
				Skill Tree Controls
			</h2>
			<div class="overflow-y-scroll h-full card pb-[90px]">
				<h3 class="text-body-1 mb-box">Tree Settings</h3>
				<FormSkillSetting
					:isRoot="isRoot"
					:data="skillTree"
					:rootSkillID="rootSkillID"
				/>

				<hr />
				<div class="flex justify-between gap-card items-center flex-wrap">
					<h3 class="text-body-1">Show Grid</h3>
					<InputSwitch v-model="showGrid" />
				</div>

				<hr />
				<h3 class="text-body-1 mb-box">Skill Information</h3>
				<FormSkill
					:isRoot="isRoot"
					:rootSkillID="rootSkillID"
					:subSkillID="subSkillID"
					:data="selectedSkill"
					:col="selectedCol"
					:row="selectedRow"
				/>
			</div>
		</aside>
	</Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
	props: {
		isRoot: { type: Boolean, default: false },
		skillTree: { type: Object as PropType<any>, default: null },
		selectedSkill: { type: Object as PropType<any>, default: null },
		selectedCol: { type: Number, default: 0 },
		selectedRow: { type: Number, default: 0 },
		rootSkillID: { type: String, default: '' },
		subSkillID: { type: String, default: '' },
		showControls: { type: Boolean, default: true },
	},
	emits: ['showGrid'],
	setup(props, { emit }) {
		const cookie_showGrid = useCookie<boolean>('showGrid');
		const showGrid = computed({
			get() {
				return cookie_showGrid.value || false;
			},
			set(data: boolean) {
				cookie_showGrid.value = data;
				emit('showGrid', data);
			},
		});

		return {
			showGrid,
		};
	},
});
</script>

<style scoped>
hr {
	@apply mb-card mt-card;
}

.v-enter-active,
.v-leave-active {
	transition: all 0.5s ease;
}

.v-enter-from,
.v-leave-to {
	opacity: 0;
	transform: translateX(50%);
}

aside {
	--bar-language-height: 46px;
	--bar-navigation-height: 28px;
	--space: 1.25rem;
	--total: calc(var(--bar-language-height) + var(--bar-navigation-height));
	--top: calc(var(--total) + var(--space));
	--screen-height: calc(100vh - var(--total) - var(--space) - var(--space));
	height: var(--screen-height);
	top: var(--top);
}

@media screen and (min-width: 768px) {
	aside {
		--space: 1.75rem;
	}
}

@media screen and (min-width: 1440px) {
	aside {
		--space: 2.5rem;
	}
}
</style>
