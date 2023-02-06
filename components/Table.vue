<template>
	<h1 v-if="loading">Loading</h1>

	<template v-else-if="data && data.length > 0">
		<div v-if="isMobile">
			<section v-for="(item, i) of data" :key="item?.id ?? i">
				<article
					v-for="{ label, key } of headers"
					:key="`${item?.id ?? i}-${key}`"
				>
					<h6>{{ t(label) }}</h6>
					<p v-if="!!!slots[key]">{{ item[key] }}</p>
					<slot :name="key" :item="item"></slot>
				</article>
			</section>
		</div>

		<table v-else class="text-body text-left table-auto w-full">
			<thead class="bg-primary style-card">
				<tr>
					<th v-for="header of headers" :key="header.key" :class="header.class">
						{{ t(header.label) }}
					</th>
				</tr>
			</thead>

			<tbody>
				<tr v-for="(item, i) of data" :key="item?.id ?? i">
					<td v-for="{ key } of headers" :key="`${item?.id ?? i}-${key}`">
						<p v-if="!!!slots[key]">{{ item[key] }}</p>
						<slot :name="key" :item="item"></slot>
					</td>
				</tr>
			</tbody>
		</table>
	</template>

	<h1 v-else>No available data</h1>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		loading: { type: Boolean, default: true },
		data: { type: Array as PropType<any[]>, default: [] },
		headers: { type: Array as PropType<any[]>, default: [] },
	},
	emits: ['isMobile'],
	setup(props, { emit }) {
		const { t } = useI18n();

		const slots = useSlots();

		const windowWidth = ref(0);
		const isMobile = ref(false);

		onMounted(() => {
			window.addEventListener('resize', handleWindowResize);
			handleWindowResize();
		});

		onUnmounted(() => {
			window.removeEventListener('resize', handleWindowResize);
		});

		function handleWindowResize() {
			windowWidth.value = window?.innerWidth ?? 0;
			if (
				!!windowWidth.value &&
				windowWidth.value > 0 &&
				windowWidth.value <= 767
			) {
				isMobile.value = true;
			} else {
				isMobile.value = false;
			}

			emit('isMobile', isMobile.value);
		}

		return { t, slots, isMobile };
	},
});
</script>

<style scoped>
tr {
	@apply transition-basic hover:bg-secondary;
}
th {
	@apply text-heading font-heading;
	padding: 15px;
}
td {
	@apply border-t border-tertiary;
	padding: 10px 15px;
}

section {
	@apply card  border-b border-secondary;
}

article {
	@apply flex justify-between mt-2;
}
article > *:last-child {
	@apply text-right;
}

article > h6 {
	@apply text-body;
}
article p {
	@apply text-heading;
}
</style>
