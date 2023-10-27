<template>
  <ul class="inline-flex -space-x-px text-base h-10">
    <li>
      <button
        class="flex items-center justify-center px-4 h-10 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        &#171;
      </button>
    </li>
    <li>
      <button
        :class="notActive"
        @click="emit('change', current - 1)"
        :disabled="current === 1"
      >
        &lt;
      </button>
    </li>
    <li v-for="index in getPageList">
      <button
        @click="index !== 0 ?? emit('change', index)"
        :class="index === current ? active : notActive"
      >
        {{ index == 0 ? '...' : index }}
      </button>
    </li>
    <li>
      <button
        :class="notActive"
        @click="emit('change', current + 1)"
        :disabled="current === total"
      >
        &#62;
      </button>
    </li>
    <li>
      <button
        class="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
      >
        &#187;
      </button>
    </li>
    <li>
      <button
        :class="pageSize === 10 ? active : notActive"
        @click="emit('change-per-page', 10)"
      >
        10
      </button>
    </li>
    <li>
      <button
        :class="pageSize === 20 ? active : notActive"
        @click="emit('change-per-page', 20)"
      >
        20
      </button>
    </li>
    <li>
      <button
        :class="pageSize === 50 ? active : notActive"
        @click="emit('change-per-page', 50)"
      >
        50
      </button>
    </li>
    <li>
      <button
        :class="pageSize === 100 ? active : notActive"
        @click="emit('change-per-page', 100)"
      >
        100
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number;
  total: number;
  pageSize: number;
}>();

const emit = defineEmits<{
  (e: 'change', page: number): void;
  (e: 'change-per-page', pageSize: number): void;
}>();

const active = ref(
  'flex items-center justify-center px-4 h-10 text-blue-600 border border-gray-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white'
);
const notActive = ref(
  'flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
);

// Todo: space between button-groups 
// Todo: round corners of pageSize buttons

const getPageList = computed(() => {
  const { current, total } = props;
  const array = [];

  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      array.push(i);
    }
  } else if (current <= 3) {
    for (let i = 1; i <= 5; i++) {
      array.push(i);
    }
  } else if (current >= total - 2) {
    for (let i = total - 4; i <= total; i++) {
      array.push(i);
    }
  } else {
    for (let i = current - 2; i <= current + 2; i++) {
      array.push(i);
    }
  }

  return array;
});
</script>

<style lang="scss" scoped></style>
