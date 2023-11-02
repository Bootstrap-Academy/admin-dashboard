<template>
  <div class="flex flex-col items-center justify-center">
    <div>
      <div class="flex items-center justify-center px-4 h-10 text-accent">
        Currently seeing: {{ currentlySeeing }}
      </div>
      <ul class="inline-flex -space-x-px text-base h-10">
        <li>
          <button :class="mostLeft" @click="current !== 1 && emit('change', 1)">
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
        <li v-for="index in getPages">
          <button
            @click="index !== 0 && emit('change', index)"
            :class="index === current ? active : notActive"
          >
            {{ index == 0 ? '...' : index }}
          </button>
        </li>
        <li>
          <button
            :class="notActive"
            @click="emit('change', current + 1)"
            :disabled="current === totalPages"
          >
            &#62;
          </button>
        </li>
        <li>
          <button
            @click="current !== totalPages && emit('change', totalPages)"
            :class="mostRight"
          >
            &#187;
          </button>
        </li>
      </ul>
    </div>
    <div>
      <div>
        <div class="flex items-center justify-center px-4 h-10 text-accent">
          Per page: {{ perPage }}
        </div>
      </div>
      <ul class="inline-flex -space-x-px text-base h-10">
        <li>
          <button
            :class="
              perPage === 10
                ? 'flex items-center justify-center px-4 h-10 text-blue-600 border border-gray-300 bg-blue-50 rounded-l-lg'
                : 'flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-primary rounded-l-lg'
            "
            @click="emit('change-per-page', 10)"
          >
            10
          </button>
        </li>
        <li>
          <button
            :class="perPage === 20 ? active : notActive"
            @click="emit('change-per-page', 20)"
          >
            20
          </button>
        </li>
        <li>
          <button
            :class="perPage === 50 ? active : notActive"
            @click="emit('change-per-page', 50)"
          >
            50
          </button>
        </li>
        <li>
          <button
            :class="
              perPage === 100
                ? 'flex items-center justify-center px-4 h-10 text-blue-600 border border-gray-300 bg-blue-50 rounded-r-lg'
                : 'flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-primary rounded-r-lg'
            "
            @click="emit('change-per-page', 100)"
          >
            100
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number;
  totalResults: number;
  perPage: number;
}>();

const emit = defineEmits<{
  (e: 'change', page: number): void;
  (e: 'change-per-page', perPage: number): void;
}>();

const active = ref(
  'flex items-center justify-center px-4 h-10 text-blue-600 border border-gray-300 bg-blue-50'
);
const notActive = ref(
  'flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-primary'
);
const mostLeft = ref(
  'flex items-center justify-center px-4 h-10 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-primary'
);
const mostRight = ref(
  'flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-primary'
);

const totalPages = computed(() => {
  return Math.ceil(props.totalResults / props.perPage);
});

const currentlySeeing = computed(() => {
  const { current, totalResults, perPage } = props;
  const start = (current - 1) * perPage + 1;
  const end =
    current * perPage > totalResults ? totalResults : current * perPage;
  return `${start} - ${end}`;
});

const getPages = computed(() => {
  const { current } = props;
  const array = [];

  if (totalPages.value <= 5) {
    for (let i = 1; i <= totalPages.value; i++) {
      array.push(i);
    }
  } else if (current <= 3) {
    for (let i = 1; i <= 5; i++) {
      array.push(i);
    }
  } else if (current >= totalPages.value - 2) {
    for (let i = totalPages.value - 4; i <= totalPages.value; i++) {
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
