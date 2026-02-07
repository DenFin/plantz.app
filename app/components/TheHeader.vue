<script setup lang="ts">
type NavItem = {
  text: string
  to: string
}

const navItems: Array<NavItem> = [
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
  },
]

const authClient = useAuthClient()
const session = authClient.useSession()
</script>

<template>
  <header class="bg-emerald-800 text-emerald-50 py-2 shadow-lg left-2  right-2 rounded-md fixed top-2 z-20 flex">
    <BaseContainer class="px-4 sm:px-0 container mx-auto flex items-center justify-between">
      <NuxtLink
        class="font-bold"
        to="/"
      >
        plantz.app
      </NuxtLink>
      <nav>
        <ul class="flex gap-4 items-center">
          <li
            v-for="(item, index) in navItems"
            :key="`nav-item-${index}`"
          >
            <NuxtLink
              active-class="font-bold"
              :to="item.to"
            >
              {{ item.text }}
            </NuxtLink>
          </li>
          <li v-if="session.data">
            <span class="text-emerald-100 text-sm">{{ session.data.user?.name ?? session.data.user?.email }}</span>
          </li>
          <li v-if="session.data">
            <button
              type="button"
              class="text-sm underline hover:no-underline"
              @click="authClient.signOut()"
            >
              Abmelden
            </button>
          </li>
          <li v-else>
            <NuxtLink
              to="/login"
              class="text-sm underline hover:no-underline"
            >
              Anmelden
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </BaseContainer>
  </header>
</template>
