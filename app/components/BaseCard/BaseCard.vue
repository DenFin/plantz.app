<template>
  <article class="lg:block shadow-lg rounded-lg overflow-hidden h-full" :class="$slots.image ? 'flex items-stretch ' : 'block ' ">
    <header class="lg:w-full" :class="$slots.image ? 'w-2/12 ' : 'w-full ' ">
      <slot name="image" />
    </header>
    <div class="w-10/12 lg:w-full bg-white dark:text-gray-900 p-4  text-sm lg:text-base" :class="$slots.image ? 'w-10/12 ' : 'w-full ' ">
      <slot name="default" />
    </div>
  </article>
</template>
