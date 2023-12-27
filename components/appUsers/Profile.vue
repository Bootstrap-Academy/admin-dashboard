<template>
	<section class="card style-card bg-secondary h-fit">
		<h2 class="text-heading-2 mb-card">Profile Information</h2>

		<template v-for="item of list" :key="item.label">
			<article>
				<h3>{{ item.label }}</h3>

				<div
					v-if="item.src"
					class="flex gap-2 md:gap-4 items-center max-w-[350px]"
				>
					<img
						:src="item.src"
						alt=""
						class="h-5 w-5 md:h-10 md:w-10 object-contain rounded-full"
					/>
					<p class="clamp line-1 text-body-1 text-heading">
						{{ item.value }}
					</p>
				</div>
				<p v-else :title="item.value">
					{{ item.value }}
				</p>
			</article>
			<hr />
		</template>

		<article v-if="tags.value.length > 0" class="flex-col">
			<h3>{{ tags.label }}</h3>
			<Chip v-for="tag of tags.value" :key="tag">{{ tag }}</Chip>
		</article>

		<article v-if="description.value" class="flex-col">
			<h3>{{ description.label }}</h3>
			<p>{{ description.value }}</p>
		</article>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export default defineComponent({
  props: { data: { type: Object as PropType<any>, default: null } },
  setup(props) {
    const last_name_change = computed(() => {
      let { date, month, year } = convertTimestampToDate(
        props.data?.last_name_change ?? ''
      );
      return {
        label: 'Last Name Change',
        value: `${date} ${month?.string ?? ''}, ${year}`,
      };
    });

    const description = computed(() => {
      return {
        label: 'Description',
        value: props.data?.description ?? '',
      };
    });

    const tags = computed(() => {
      return {
        label: 'Tags',
        value: props.data?.tags ?? [],
      };
    });

    const list = computed(() => {
      return [
        {
          label: 'ID',
          value: props.data?.id ?? '',
        },
        {
          label: 'Name',
          value: props.data?.name ?? '',
          src: props.data?.avatar_url ?? '',
        },
        {
          label: 'Display Name',
          value: props.data?.display_name ?? '',
        },
        {
          label: 'Email',
          value: props.data?.email ?? '',
        },
        last_name_change.value,
      ];
    });

    return { list, description, tags };
  },
});
</script>

<style scoped>
article {
	@apply flex justify-between gap-box flex-wrap;
}
article > h3 {
	@apply text-heading-4 flex gap-3 items-center text-body;
}
article > p {
	@apply text-body-1 text-heading;
	width: fit-content;
}
hr {
	@apply mt-box mb-box;
}
article h3 .pencil-icon {
	@apply w-5 h-5 text-info;
}
.icon {
	@apply h-8 w-8;
}
</style>
