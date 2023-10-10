<template>
	<div>
		<section class="bg-secondary card style-card grid gap-card-sm">
			<div class="flex gap-box items-start justify-between">
				<SectionTitle
					sub
					:heading="header.heading"
					:body="header.body"
					class="mb-0"
				/>
				<ProgressXP :data="progress" />
			</div>

			<template v-if="loading">
				<ProgressSkeleton v-for="n in 3" :key="n" />
			</template>

			<template v-else-if="activeSkills && activeSkills.length > 0">
				<Progress v-for="(skill, i) of activeSkills" :key="i" :data="skill" />
			</template>
		</section>

		<section class="bg-secondary card style-card grid gap-card-sm mt-container">
			<SectionTitle sub heading="Other Skills" class="mb-0" />

			<template v-if="loading">
				<ProgressSkeleton v-for="n in 3" :key="n" />
			</template>

			<template v-else-if="otherSkills && otherSkills.length > 0">
				<Progress v-for="(skill, i) of otherSkills" :key="i" :data="skill" />
			</template>
		</section>
	</div>
</template>

<script lang="ts">
import { defineComponent, PropType, provide } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: { data: { type: Object as PropType<any>, default: null } },
	setup(props) {
		const { t } = useI18n();

		const header = reactive({
			heading: 'Active Skills',
			body: '',
		});

		const loading = ref(true);

		const id = computed(() => {
			return props?.data?.id ?? '';
		});

		provide('userID', id);

		const progress: any = reactive({});

		const skills = computed(() => {
			return progress?.skills ?? [];
		});

		const activeSkills = computed(() => {
			return skills.value.filter((skill: any) => skill.progress > 0);
		});

		const otherSkills = computed(() => {
			return skills.value.filter((skill: any) => skill.progress == 0);
		});

		watch(
			() => id.value,
			async (newValue, oldValue) => {
				if (Boolean(newValue)) {
					loading.value = true;
					const [success, error] = await getXPOfThisUser(newValue);
					loading.value = false;

					if (success) {
						Object.assign(progress, success);
					}
					console.log('progress', progress);

					if (activeSkills.value && activeSkills.value.length <= 0) {
						Object.assign(header, {
							heading: 'No Active Skills',
							body: 'User has not started any skills',
						});
					}
				}
			},
			{ immediate: true, deep: true }
		);

		return { t, loading, progress, header, activeSkills, otherSkills };
	},
});
</script>

<style scoped></style>
