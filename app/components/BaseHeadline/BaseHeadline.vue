<template>
  <component
    :is="props.element"
    class="font-bold text-gray-900 dark:text-white" :class="[textSizeClasses]"
  >
    <slot>{{ props.text }}</slot>
  </component>
</template>

<script setup lang="ts">
type Props = {
  element?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  size?: 'sm' | 'md' | 'lg'
  text: string
}

const props = withDefaults(defineProps<Props>(), {
  element: 'h1',
  size: 'md',
})

const textSizeClasses = computed<string>(() => {
  switch (props.element) {
    case 'h1':
      return 'text-6xl mb-6'
    case 'h2':
      return 'text-3xl mb-5'
    case 'h3':
      return 'text-xl mb-2'
    default:
      return ''
  }
})
</script>
