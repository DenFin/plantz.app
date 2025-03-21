<script setup lang="ts">

const navItems = [
  {
    text: 'Dashboard',
    to: '/',
  },
  {
    text: 'Plants',
    to: '/plants',
  },
  {
    text: 'Rooms',
    to: '/rooms',
  }
]

</script>

<template>
  <header class="bg-emerald-800 text-emerald-50 py-2 shadow-lg left-2  right-2 rounded-md fixed top-2 z-20 flex">
    <BaseContainer class="px-4 sm:px-0 container mx-auto flex items-center justify-between">
      <NuxtLink class="font-bold" to="/">plantz.app</NuxtLink>
      <nav>
        <ul class="flex gap-4">
          <li v-for="(item, index) in navItems">
            <NuxtLink active-class="font-bold" :to="item.to">{{ item.text}}</NuxtLink>
          </li>
        </ul>
      </nav>
      <div></div>
    </BaseContainer>
  </header>
</template>
