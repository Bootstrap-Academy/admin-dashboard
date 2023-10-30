<template>
	<section class="card style-card bg-secondary grid gap-card">
		<article v-for="(stat, i) of stats" :key="i">
			<p class="text-sm">{{ t(stat.heading) }}</p>
			<Chip v-if="stat.chip" :color="stat.color" class="w-fit mt-3">
				{{ t(stat.value) }}
			</Chip>
			<h6 v-else class="mt-1">{{ t(stat.value) }}</h6>
		</article>
	</section>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
	props: {
		data: { type: Object as PropType<any>, default: null },
	},
	setup(props) {
		const { t } = useI18n();

		const salaryPer = computed(() => {
			let _salaryPer = (props.data?.salary?.per ?? '').toLocaleLowerCase();
			switch (_salaryPer) {
				case 'once':
					return '';
				case 'task':
					return `/ ${t('Headings.Task').toLocaleLowerCase()}`;
				case 'hour':
					return `/ ${t('Headings.Hour').toLocaleLowerCase()}`;
				case 'day':
					return `/ ${t('Headings.Day').toLocaleLowerCase()}`;
				case 'month':
					return `/ ${t('Headings.Month').toLocaleLowerCase()}`;
				case 'year':
					return `/ ${t('Headings.Year').toLocaleLowerCase()}`;
				default:
					return _salaryPer;
			}
		});

		const salary = computed(() => {
			let min = props.data?.salary?.min ?? 0;
			let max = props.data?.salary?.max ?? 0;
			let unit = props.data?.salary?.unit ?? '';

			return `${abbreviateNumber(min)} - ${abbreviateNumber(max)} ${unit} ${
				salaryPer.value
			}`;
		});

		const type = computed(() => {
			let _type = (props.data?.type ?? '').toLocaleLowerCase();
			switch (_type) {
				case 'full_time':
					return 'List.Filter.FullTime';
				case 'part_time':
					return 'List.Filter.PartTime';
				case 'internship':
					return 'List.Filter.Internship';
				case 'temporary':
					return 'List.Filter.Temporary';
				case 'mini_job':
					return 'List.Filter.MiniJob';
				default:
					return _type;
			}
		});

		const professional_level = computed(() => {
			let level = (props.data?.professional_level ?? '').toLocaleLowerCase();
			switch (level) {
				case 'entry':
					return 'List.Filter.Entry';
				case 'junior':
					return 'List.Filter.Junior';
				case 'senior':
					return 'List.Filter.Senior';
				case 'manager':
					return 'List.Filter.Manager';
				default:
					return level;
			}
		});

		const stats = computed(() => {
			return [
				{
					heading: 'Headings.ProfessionalLevel',
					value: professional_level.value,
				},
				{
					heading: 'Headings.EmploymentType',
					value: type.value,
				},
				{
					heading: 'Headings.OfferSalary',
					value: salary.value,
				},
				{
					heading: 'Headings.Location',
					value: props.data?.location ?? '---',
				},
				{
					heading: 'Headings.JobEnvironment',
					value:
						props.data?.remote ?? false
							? t('List.Filter.Remote')
							: t('List.Filter.Office'),
					chip: true,
					color: props.data?.remote ?? false ? 'bg-info' : 'bg-warning',
				},
				{
					heading: 'Headings.Contact',
					value: props.data?.contact ?? '---',
				},
			];
		});

		return { t, stats };
	},
});
</script>

<style scoped></style>
