<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] gap-10 text-center">
    <div class="flex flex-col gap-4">
      <h1 class="text-3xl md:text-4xl font-bold text-emerald-900">
        plantz.app
      </h1>
      <p class="text-lg text-gray-600 max-w-md">
        Verfolge den Wachstumsfortschritt deiner Zimmerpflanzen – Fotos, Notizen und Erinnerungen an einem Ort.
      </p>
    </div>
    <div class="flex flex-col sm:flex-row gap-4">
      <UButton
        size="xl"
        to="/login"
        class="min-w-[180px]"
      >
        Anmelden
      </UButton>
      <UButton
        size="xl"
        variant="outline"
        to="/register"
        class="min-w-[180px]"
      >
        Registrieren
      </UButton>
    </div>
    <p class="text-sm text-gray-500">
      Melde dich an, um dein Dashboard und deine Pflanzen zu sehen.
    </p>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Start',
})
definePageMeta({
  title: 'Start',
})
</script>
