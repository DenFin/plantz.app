<script setup lang="ts">
</script>

<template>
  <header class="bg-green-800 text-green-50 py-2 shadow-lg left-2  right-2 rounded-md fixed top-2 z-20 flex">
    <BaseContainer class="px-4 sm:px-0 container mx-auto flex items-center justify-between">
      <NuxtLink to="/">plantz.app</NuxtLink>
      <nav>
        <ul class="flex">
          <li>
            <NuxtLink active-class="font-bold" to="/plants">Plants</NuxtLink>
          </li>
        </ul>
      </nav>
    </BaseContainer>
  </header>
</template>
