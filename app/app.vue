<template>
  <div class="bg-emerald-50 text-gray-800 dark:text-gray-800 min-h-screen pb-2">
    <UApp :toaster="{ position: 'bottom-center' }">
      <TheHeader />
      <pre>{{ session }}</pre>
      <BaseContainer class="pt-20 pb-40 min-h-screen">
        <NuxtPage />
      </BaseContainer>
      <TheFooter />
    </UApp>
  </div>
</template>

<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'

const route = useRoute()
useHead({
  titleTemplate: '%s | plantz.app',
  meta: [
    { property: 'og:title', content: `${route.meta.title} | plantz.app` },
    { name: 'description', content: 'plantz.app ist eine App um den Wachstumsfortschritt von Zimmerpflanzen zu verfolgen.' },
  ],
})

const { data: session } = await authClient.useSession(useFetch)
</script>
