<template>
  <div class="flex flex-col justify-between text-white items-center">
    <slot />

    <div class="flex items-center mb-4" v-for="(option, index) in modelValue">
      <label
        :for="index.toString()"
        class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
        >{{ t(option.label) }}</label
      >
      <input
        :id="index.toString()"
        :name="index.toString()"
        type="checkbox"
        :checked="option.value === true"
        @input="option.value === true ? option.value = undefined :option.value = true"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
      <input
        :id="index.toString()"
        :name="index.toString()"
        type="checkbox"
        :checked="option.value === false"
        @input="option.value === false ? option.value = undefined :option.value = false"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
      />
    </div>
    <div class="flex justify-between w-3/4">
      <button class="text-accent" @click="emit('cancel')">Cancel</button>
      <button class="text-accent" @click="emit('save', modelValue)">
        Save
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckOption } from '~/types/componentTypes';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: CheckOption[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', newValue: CheckOption): void;
  (e: 'cancel'): void;
  (e: 'save', value: CheckOption[]): void;
}>();

const testF = (option: CheckOption) => {
  console.log(option.value);
};
</script>

<style scoped></style>
