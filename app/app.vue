<template>
  <div class="bg-emerald-50 text-gray-800 dark:text-gray-800 min-h-screen pb-2">
    <UApp :toaster="{ position: 'bottom-center' }">
      <TheHeader />
      <BaseContainer class="pt-20 pb-40 min-h-screen">
        <NuxtPage />
      </BaseContainer>
      <TheFooter />
    </UApp>
  </div>
</template>
