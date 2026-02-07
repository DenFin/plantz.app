<template>
  <article class="flex lg:block shadow-lg rounded-lg overflow-hidden h-full">
    <header class="w-2/12 lg:w-full">
      <slot name="image" />
    </header>
    <div class="w-10/12 lg:w-full bg-white dark:text-gray-900 p-4 h-full  text-sm lg:text-base">
      <slot name="default" />
    </div>
  </article>
</template>
