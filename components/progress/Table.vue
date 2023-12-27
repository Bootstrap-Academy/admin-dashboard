<template>
	<div>
		<article class="card pt-0">
			<hr class="mt-box mb-box" />

			<div
				class="hidden md:grid gap-x-container gap-y-card-sm grid-cols-[1fr_auto_auto_auto]"
			>
				<h2 class="text-heading-5">Sub Skill</h2>
				<h2 class="text-heading-5 text-center">Level</h2>
				<h2 class="text-heading-5 text-center">XP</h2>
				<h2 class="text-heading-5 text-center">Actions</h2>

				<template v-for="(skill, i) of skills" :key="skill.skill ?? i">
					<div class="flex flex-wrap items-center gap-box">
						<p class="capitalize text-body-2 break-words">
							{{ (skill.skill ?? '---').replace(/_/g, ' ') }}
						</p>
						<Rating v-if="skill.rating != null" :rating="skill.rating" sm />
					</div>

					<Chip
						v-if="skill && skill.completed"
						color="chip-color-1"
						class="w-fit"
					>
						{{ t('Headings.Completed') }}
					</Chip>
					<p class="text-body-2 text-center" v-else>{{ skill.level ?? 0 }}</p>

					<p class="text-body-2 text-center">
						{{ abbreviateNumber(skill.xp ?? 0) }}
					</p>

					<div class="flex items-center gap-2 place-self-start">
						<Icon
							@click="onclickManageXPForThisSubSkill(skill.skill, skill.xp)"
							class="cursor-pointer"
							bgColor="bg-warning-light"
							iconColor="text-warning"
							rounded
							sm
							:icon="PencilSquareIcon"
						/>
					</div>
				</template>
			</div>

			<div class="grid md:hidden gap-card-sm grid-cols-[1fr_auto]">
				<template v-for="(skill, i) of data" :key="skill.skill ?? i">
					<h2 class="text-heading-5">Skill</h2>

					<div class="flex flex-wrap items-center gap-box">
						<p class="capitalize text-body-2 break-words text-right">
							{{ (skill.skill ?? '---').replace(/_/g, ' ') }}
						</p>
						<Rating v-if="skill.rating != null" :rating="skill.rating" sm />
					</div>

					<h2 class="text-heading-5">Level</h2>
					<Chip
						v-if="skill && skill.completed"
						color="chip-color-1"
						class="w-fit place-self-end"
					>
						{{ t('Headings.Completed') }}
					</Chip>
					<p class="text-body-2 text-right" v-else>{{ skill.level ?? 0 }}</p>

					<h2 class="text-heading-5">XP</h2>
					<p class="text-body-2 text-right">
						{{ abbreviateNumber(skill.xp ?? 0) }}
					</p>

					<h2 class="text-heading-5">Actions</h2>
					<div class="flex items-center gap-2 place-self-end">
						<Icon
							@click="onclickManageXPForThisSubSkill(skill.skill, skill.xp)"
							class="cursor-pointer"
							bgColor="bg-warning-light"
							iconColor="text-warning"
							rounded
							sm
							:icon="PencilSquareIcon"
						/>
					</div>

					<hr class="col-span-2" />
				</template>
			</div>
		</article>
		<Modal v-if="xpDialog" @backdrop="xpDialog = false">
			<FormXP
				:skill="rootSkillId"
				:subSkill="subSkill"
				:subSkillXP="subSkillXP"
				@subSkill="updateSubSkill($event)"
				@isSuccess="xpDialog = false"
			/>
		</Modal>
	</div>
</template>

<script lang="ts">
import { useI18n } from 'vue-i18n';

import { defineComponent } from 'vue';
import type {  PropType } from 'vue';
import {
  EyeIcon,
  UserGroupIcon,
  PencilSquareIcon,
} from '@heroicons/vue/24/outline/index.js';
import IconCoaching from '~/components/icon/Coaching.vue';

export default defineComponent({
  components: { EyeIcon, IconCoaching, UserGroupIcon, PencilSquareIcon },
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    rootSkillId: { type: String, default: '' },
  },
  setup(props) {
    const { t } = useI18n();

    const router = useRouter();

    const subSkill = ref('');
    const subSkillXP = ref(0);
    const xpDialog = ref(false);

    function onclickViewThisSubSkillPath(subSkillID: string) {
      router.push(`/skill-tree/${props.rootSkillId}/${subSkillID}`);
    }
    function onclickManageXPForThisSubSkill(subSkillID: string, xp: any) {
      subSkill.value = subSkillID;
      subSkillXP.value = xp;
      xpDialog.value = true;
    }

    function updateSubSkill(subSkill: any) {
      let indexOfSubSkill = skills.findIndex(
        (skill: any) => skill.skill == subSkill.skill
      );

      if (indexOfSubSkill >= 0) {
        skills.splice(indexOfSubSkill, 1, {
          ...subSkill,
        });
      }
    }

    const skills: any[] = reactive(props.data ?? []);

    return {
      t,
      onclickViewThisSubSkillPath,
      onclickManageXPForThisSubSkill,
      EyeIcon,
      IconCoaching,
      UserGroupIcon,
      skills,
      PencilSquareIcon,
      xpDialog,
      subSkill,
      subSkillXP,
      updateSubSkill,
    };
  },
});
</script>

<style scoped></style>
