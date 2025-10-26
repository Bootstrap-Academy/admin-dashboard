<template>
	<div class="space-y-4">
		<div v-if="loading" class="h-64 w-full animate-pulse rounded-lg bg-slate-800/40" />
		<p
			v-else-if="error"
			class="rounded-lg border border-red-500/40 bg-red-900/30 p-4 text-sm text-red-200"
		>
			{{ error }}
		</p>
		<p
			v-else-if="!buckets.length"
			class="rounded-lg border border-slate-700 bg-slate-900/40 p-4 text-center text-sm text-slate-300"
		>
			{{ emptyMessage }}
		</p>
		<Line v-else :data="chartData" :options="chartOptions" class="h-64 w-full" />
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

type Bucket = {
  bucket_start: number;
  active_users: number;
};

const props = defineProps<{
  buckets: Bucket[];
  loading: boolean;
  error: string | null;
  emptyMessage?: string;
}>();

const labels = computed(() =>
  props.buckets.map((item) =>
    new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(item.bucket_start * 1000),
  ),
);

const datasetValues = computed(() => props.buckets.map((item) => item.active_users));

const chartData = computed(() => ({
  labels: labels.value,
  datasets: [
    {
      label: 'Active users',
      data: datasetValues.value,
      borderColor: '#38bdf8',
      backgroundColor: '#38bdf8',
      pointRadius: 2,
      borderWidth: 2,
      tension: 0.25,
    },
  ],
}));

const chartOptions = computed(() => ({
  maintainAspectRatio: false,
  responsive: true,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: (ctx: any) => `${ctx.parsed.y} active users`,
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: '#94a3b8',
      },
      grid: {
        color: '#1e293b',
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#94a3b8',
        precision: 0,
      },
      grid: {
        color: '#1e293b',
      },
    },
  },
}));

const emptyMessage = computed(() => props.emptyMessage ?? 'No activity recorded for this period.');
</script>
