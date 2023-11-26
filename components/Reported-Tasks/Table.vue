<template>
	<div>
		<Table :data="data" :loading="isLoading" :headers="headers">
			<template #reportedBy="{ item }">
				<div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
					<p class="clamp line-1 text-body-2">
						{{ item?.userName ?? "" }}
					</p>
				</div>
			</template>

			<template #reason="{ item }">
				<chip class="w-fit">
					{{ item?.reason ?? "" }}
				</chip>
			</template>

			<template #comment="{ item }">
				<div class="flex gap-2 md:gap-4 items-center max-w-[350px]">
					<p class="clamp line-1 text-body-2">
						{{ item?.comment ?? "" }}
					</p>
				</div>
			</template>

			<template #timestamp="{ item }">
				<p class="text-body-2">
					{{ item?.timestamp.split("T")[0] ?? "no date" }}
					{{
						item?.timestamp
							.split("T")[1]
							.split(".")[0]
							.split(":")
							.slice(0, 2)
							.join(":")
					}}
				</p>
			</template>

			<template #actions="{ item }">
				<div class="flex justify-center">
					<button
						class="w-5 h-auto cursor-pointer rounded"
						@click="onclickEditItem(item)"
					>
						<EyeIcon class="cursor-pointer" />
					</button>
				</div>
			</template>
		</Table>
	</div>
</template>

<script lang="ts">
	import { EyeIcon } from "@heroicons/vue/24/outline/index.js";
	import { computed } from "vue";
	import type { PropType } from "vue";
	import type { ReportBase } from "~/types/reportedTaskTypes";
	import {
		useReportReason,
		useReportSubtaskType,
	} from "~~/composables/reportedSubtasks";
	export default {
		props: {
			data: { type: Array as PropType<any[]>, default: [] },
			loading: { type: Boolean, default: true },
		},

		components: {
			EyeIcon,
		},
		setup(props) {
			const isLoading = computed(() => {
				return props.loading ;
			});

			const headers = computed(() => {
				let arrHeaders = [
					{
						label: "Headings.ReportedBy",
						key: "userName",
					},
					{
						label: "Task Owner",
						key: "creatorName",
					},
					{
						label: "Headings.Reason",
						key: "reason",
					},
					{
						label: "Headings.Comment",
						key: "comment",
					},
					{
						label: "Headings.ReportedAt",
						key: "timestamp",
					},
					{
						label: "Headings.Actions",
						key: "actions",
						class: "text-center",
					},
				];

				return arrHeaders;
			});

			const router = useRouter();
			const reportedTask = useReportedSubtask()

			function onclickEditItem(item: ReportBase) {
				reportedTask.value = item;
				if (Boolean(!item) || Boolean(!item.id)) return;
				// Todo: remove this unrelated stuff -> all info is already in reportedTask
				// Todo: I have to edit and remove reportReasen & type everywhere it's used
				const reportReason = useReportReason();
				reportReason.value = item?.comment ?? "";
				const reportSubtaskType = useReportSubtaskType();
				reportSubtaskType.value = item?.subtask_type ?? "";
				router.push(
					`/dashboard/reported-tasks/${item.id}?taskId=${item.task_id}&subtaskId=${item.subtask_id}`
				);
			}

			return {
				headers,
				onclickEditItem,
				isLoading,
				EyeIcon,
			};
		},
	};
</script>

<style scoped></style>
