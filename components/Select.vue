<template>
    <div class="flex flex-row justify-between text-white items-center">
        <slot />

        <div class="flex items-center mr-4">
            <input checked id="red-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="red-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Red</label>
        </div>
        <div class="flex items-center mr-4">
            <input checked id="green-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="green-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Green</label>
        </div>
        <div class="flex items-center mr-4">
            <input checked id="purple-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="purple-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Purple</label>
        </div>
        <div class="flex items-center mr-4">
            <input checked id="teal-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500 dark:focus:ring-teal-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="teal-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Teal</label>
        </div>
        <div class="flex items-center mr-4">
            <input checked id="yellow-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-yellow-400 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="yellow-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Yellow</label>
        </div>
        <div class="flex items-center mr-4">
            <input checked id="orange-checkbox" type="checkbox" value=""
                class="w-4 h-4 text-orange-500 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            <label for="orange-checkbox" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Orange</label>
        </div>

    </div>
</template>

<script setup lang="ts">

const props = defineProps<{
    modelValue: CheckOptions[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', newValue:CheckOptions): void
}>()






export class CheckOptions{
    label: string
    value: {
        key: string
        value: boolean
    }
    id: string
    name: string

    constructor(label: string, valueKey: string, value:boolean){
        this.label = label
        this.value = {
            key: valueKey,
            value: value
        }
        this.id = valueKey
        this.name = valueKey
    }
}


</script>

<style scoped></style>