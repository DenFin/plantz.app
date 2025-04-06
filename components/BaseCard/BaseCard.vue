<template>
  <article class="shadow-lg rounded-lg overflow-hidden h-full">
    <header>
      <slot name="image" />
    </header>
    <div class="bg-white dark:text-gray-900 p-3 h-full md:p-5 lg:p-6 text-sm lg:text-base">
      <slot name="default" />
    </div>
  </article>

</template>
