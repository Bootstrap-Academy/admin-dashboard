<template>
  <div class="flex flex-col justify-between text-white items-center">
    <slot />
    <div
      class="flex items-center flex-grow mb-4 flex-col"
      v-for="(option, index) in modelValue"
    >
      <p class="text-md font-medium text-gray-900 dark:text-gray-300">
        {{ t(option.label) }}
      </p>
      <div
        class="flex gap-5 border-solid border-2 border-accent p-3 rounded-md"
      >
        <label
          :for="index.toString() + 'first'"
          class="inline-flex items-center m-0"
        >
          <input
            :id="index.toString() + 'first'"
            :name="index.toString() + 'first'"
            type="checkbox"
            class="form-checkbox h-4 w-4"
            :checked="option.value === true"
            @input="
              option.value === true
                ? (option.value = undefined)
                : (option.value = true),
                emit('update:modelValue', modelValue)
            "
          />
          <p class="ml-2 font-medium text-gray-900 dark:text-gray-300">Yes</p>
        </label>
        <label
          :for="index.toString() + 'second'"
          class="inline-flex items-center m-0"
        >
          <input
            :id="index.toString() + 'second'"
            :name="index.toString() + 'second'"
            type="checkbox"
            :checked="option.value === false"
            class="form-checkbox h-4 w-4"
            @input="
              option.value === false
                ? (option.value = undefined)
                : (option.value = false),
                emit('update:modelValue', modelValue)
            "
          />
          <p class="ml-2 font-medium text-gray-900 dark:text-gray-300">No</p>
        </label>
      </div>
    </div>
    <div
      class="flex justify-center gap-20 items-center"
      v-if="!cancelDisabled || !okDisabled"
    >
      <button
        class="inline-block rounded-full bg-accent px-6 pb-2 pt-2.5 text-xs font-medium leading-normal text-primary hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] hover:scale-110"
        @click="emit('cancel')"
        v-if="!cancelDisabled"
      >
        {{ cancelLabel }}
      </button>
      <button
        class="inline-block rounded-full bg-accent px-6 pb-2 pt-2.5 text-xs font-medium leading-normal text-primary hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] hover:scale-110"
        @click="emit('save', modelValue)"
        v-if="!okDisabled"
      >
        {{ okLabel }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckOption } from '~/types/componentTypes';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(defineProps<SelectProps>(), {
  okDisabled: false,
  okLabel: 'Ok',
  cancelDisabled: false,
  cancelLabel: 'Cancel',
});

const emit = defineEmits<{
  (e: 'update:modelValue', newValue: CheckOption[]): void;
  (e: 'cancel'): void;
  (e: 'save', value: CheckOption[]): void;
}>();

interface SelectProps {
  modelValue: CheckOption[];
  okDisabled?: boolean;
  okLabel?: string;
  cancelDisabled?: boolean;
  cancelLabel?: string;
}

// This component should be used if you want true-false-undefined Check-boxes
// Give this component an Array of CheckOption's
// on save it will emit the array back to the parent component to work with
// on cancel it will emit cancel back to the parent component
</script>

<style scoped></style>
