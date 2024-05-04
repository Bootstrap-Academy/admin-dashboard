<template>
	<Table
		:data="data"
		:loading="isLoading"
		:headers="headers"
		@isMobile="isMobile = $event"
	>
		<template #icon="{ item }">
			<img
				:src="`/svgs/${item.icon}.svg`"
				alt=""
				class="h-5 w-5 md:h-10 md:w-10 xl:h-14 xl:w-14 object-contain rounded-full"
			/>
		</template>

		<template #dependencies="{ item }">
			<p class="text-center" :title="item?.dependencies ?? ''">
				{{ (item?.dependencies ?? []).length }}
			</p>
		</template>

		<template #dependents="{ item }">
			<p class="text-center" :title="item?.dependents ?? ''">
				{{ (item?.dependents ?? []).length }}
			</p>
		</template>

		<template #courses="{ item }">
			<p class="text-center" :title="item?.courses ?? ''">
				{{ (item?.courses ?? []).length }}
			</p>
		</template>

		<template #actions="{ item }">
			<div class="flex gap-3">
				<Btn sm @click="onclickManageItem(item)">Manage</Btn>

				<!-- <Icon
					@click="onclickEditItem(item)"
					class="cursor-pointer"
					rounded
					sm
					:icon="PencilIcon"
				/> -->
			</div>
		</template>
	</Table>
</template>

<script lang="ts">
import type { Ref, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

import {
  CheckCircleIcon,
  XMarkIcon,
  CheckIcon,
  PencilIcon,
} from '@heroicons/vue/24/outline/index.js';

export default {
  props: {
    data: { type: Array as PropType<any[]>, default: [] },
    loading: { type: Boolean, default: true },
    rootSkillID: { type: String, default: '' },
  },
  components: {
    CheckCircleIcon,
    PencilIcon,
    XMarkIcon,
    CheckIcon,
  },
  setup(props) {
    const { t } = useI18n();

    const isLoading = computed(() => {
      return props.loading && props.data.length <= 0;
    });

    const isMobile = ref(false);

    const headers = computed(() => {
      return [
        {
          label: 'Icon',
          key: 'icon',
        },
        {
          label: 'Name',
          key: 'name',
        },
        {
          label: '# of Dependencies',
          key: 'dependencies',
        },
        {
          label: '# of Dependents',
          key: 'dependents',
        },
        {
          label: '# of Courses',
          key: 'courses',
        },
        {
          label: 'Headings.Actions',
          key: 'actions',
          class: 'text-center',
        },
      ];
    });

    const router = useRouter();
    const subSkill = useSubSkill();

    function onclickManageItem(item: any) {
      if (!props.rootSkillID) return;
      router.push(
        `/dashboard/skill-tree/${props.rootSkillID}/manage?subSkillID=${item.id}`
      );
    }

    function onclickEditItem(item: any) {
      if (Boolean(!item) || Boolean(!item.id)) return;
      subSkill.value = item;

      router.push(`/dashboard/skill-tree/${props.rootSkillID}/edit/${item.id}`);
    }

    return {
      isLoading,
      isMobile,
      headers,
      XMarkIcon,
      PencilIcon,
      onclickManageItem,
      onclickEditItem,
    };
  },
};
</script>

<style scoped>
.icon {
	@apply h-5 w-5 md:mx-auto;
}
</style>
