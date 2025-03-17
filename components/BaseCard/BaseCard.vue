<template>
  <article class="shadow-lg rounded-lg overflow-hidden">
    <header>
      <slot name="image" />
    </header>
    <div class="bg-white dark:text-gray-900 p-3 h-full lg:p-8 text-sm lg:text-base">
      <slot name="default" />
    </div>
  </article>

</template>
