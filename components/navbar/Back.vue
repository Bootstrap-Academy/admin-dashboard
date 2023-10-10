<template>
	<section
		class="container-fluid bg-secondary flex gap-4 items-center justify-between"
	>
		<Btn tertiary :icon="ArrowLeftIcon" @click="onclickNavigate">
			<img src="/images/logo.png" class="w-6 h-auto object-contain" alt="" />

			{{ t(label) }}
		</Btn>

		<div id="navbar-back-end"></div>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ArrowLeftIcon } from '@heroicons/vue/24/solid/index.js';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	components: { ArrowLeftIcon },
	setup() {
		const { t } = useI18n();

		const router = useRouter();

		const pathname = ref('');
		const label = ref('');

		function hasHistory() {
			return window.history.length > 2;
		}
		function onclickNavigate() {
			if (Boolean(!pathname.value)) {
				hasHistory() ? router.go(-1) : router.push('/');
			} else {
				router.push(pathname.value);
			}
		}
		function setBackRoute(to: string) {
			// ! Users
			if (to == 'dashboard-users-id') {
				pathname.value = '/dashboard/users';
				label.value = 'Links.Users';
			}

			// ! Jobs
			else if (to == 'dashboard-jobs-id' || to == 'dashboard-jobs-create') {
				pathname.value = '/dashboard/jobs';
				label.value = 'Links.Jobs';
			}

			// ! Skill Tree
			else if (
				to == 'dashboard-skill-tree-id' ||
				to == 'dashboard-skill-tree-create'
			) {
				pathname.value = '/dashboard/skill-tree';
				label.value = 'Links.SkillTree';
			}

			// ! Default
			else {
				pathname.value = '';
				label.value = 'Links.GoBack';
			}
		}

		router.afterEach((to, from) => {
			setBackRoute(<string>to.name);
		});

		onMounted(() => {
			const route = useRoute();
			setBackRoute(<string>route.name);
		});

		return { ArrowLeftIcon, t, onclickNavigate, pathname, label };
	},
});
</script>

<style scoped></style>
