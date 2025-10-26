<template>
	<main class="space-y-6">
		<PageTitle />

		<section class="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-900/30">
			<header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-1">
					<h2 class="text-xl font-semibold text-slate-100">Active users</h2>
					<p class="text-sm text-slate-400">Unique signed-in visitors across the selected period.</p>
				</div>
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
					<div class="flex flex-col gap-2">
						<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Range</span>
						<div class="flex flex-wrap gap-2">
							<button
								v-for="option in rangeOptions"
								:key="option.value"
								type="button"
								class="rounded-full px-3 py-1 text-sm font-medium transition"
								:class="option.value === selectedRange ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
								@click="onSelectRange(option.value)"
							>
								{{ option.label }}
							</button>
						</div>
					</div>
					<div class="flex flex-col gap-2">
						<span class="text-xs font-semibold uppercase tracking-wide text-slate-500">Smoothing</span>
						<div class="flex flex-wrap gap-2">
							<button
								v-for="option in activeGranularityOptions"
								:key="option.value"
								type="button"
								class="rounded-full px-3 py-1 text-sm font-medium transition"
								:class="option.value === selectedGranularity ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
								@click="onSelectGranularity(option.value)"
							>
								{{ option.label }}
							</button>
						</div>
					</div>
				</div>
			</header>

			<div class="mt-6">
				<ActiveUsersChart
					:buckets="buckets"
					:loading="loading"
					:error="errorMessage"
					empty-message="No activity recorded for the selected combination."
				/>
			</div>
		</section>
	</main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ActiveUsersChart from '@/components/dashboard/ActiveUsersChart.vue';
import { GET } from '@/composables/fetch';

definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
});

useHead({
  title: 'Dashboard',
});

type RangeValue = '1d' | '7d' | '30d' | '90d';
type GranularityValue = '1h' | '1d' | '7d' | '30d';

type Bucket = {
  bucket_start: number;
  active_users: number;
};

const rangeOptions: Array<{ value: RangeValue; label: string }> = [
  { value: '1d', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const granularityOptions: Array<{ value: GranularityValue; label: string }> = [
  { value: '1h', label: '1 hour' },
  { value: '1d', label: '1 day' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

const allowedGranularity: Record<RangeValue, GranularityValue[]> = {
  '1d': ['1h', '1d'],
  '7d': ['1h', '1d', '7d'],
  '30d': ['1d', '7d', '30d'],
  '90d': ['1d', '7d', '30d'],
};

const selectedRange = ref<RangeValue>('7d');
const selectedGranularity = ref<GranularityValue>('1d');

const buckets = ref<Bucket[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

const activeGranularityOptions = computed(() =>
  granularityOptions.filter((option) =>
    allowedGranularity[selectedRange.value].includes(option.value),
  ),
);

function onSelectRange(value: RangeValue) {
  selectedRange.value = value;
}

function onSelectGranularity(value: GranularityValue) {
  selectedGranularity.value = value;
}

async function fetchActiveUsers(range: RangeValue, granularity: GranularityValue) {
  loading.value = true;
  errorMessage.value = null;

  try {
    const response = await GET('/analytics/active-users', {
      range,
      granularity,
    });

    if (Array.isArray(response)) {
      buckets.value = response.map((item: any) => ({
        bucket_start: Number(item.bucket_start),
        active_users: Number(item.active_users ?? 0),
      }));
    } else {
      buckets.value = [];
    }
  } catch (err: any) {
    buckets.value = [];
    errorMessage.value = err?.data?.detail ?? 'Unable to load active users. Please try again later.';
  } finally {
    loading.value = false;
  }
}

watch(
  [selectedRange, selectedGranularity],
  async ([range, granularity]) => {
    const allowed = allowedGranularity[range];
    if (!allowed.includes(granularity)) {
      selectedGranularity.value = allowed[0];
      return;
    }

    await fetchActiveUsers(range, granularity);
  },
  { immediate: true },
);
</script>
