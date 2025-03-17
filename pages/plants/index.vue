<template>
  <section v-if="plants" class="pb-20">
    <div class="dark:text-gray-900">
      <div class="flex gap-1 items-center mb-4">
        <NuxtLink to="/">
          <Icon name="heroicons-solid:home" />
        </NuxtLink>
        <Icon name="heroicons:chevron-right" />
        <p class="font-bold">Plants</p>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-4">
      <BaseCard v-for="plant in plants.data" :key="plant.id">
        <template #image>
          <!-- Plant Thumbnail -->
          <div v-if="plant.thumbnail" class="w-full aspect-square overflow-hidden">
            <img :src="plant.thumbnail.url" :alt="`Photo of ${plant.name}`" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon name="heroicons:photo" class="w-8 h-8 text-gray-400" />
          </div>
        </template>

        <template #default>
          <NuxtLink class="block" :to="`/plants/${plant.id}`">
            <h3 class="font-bold text-md lg:text-lg">{{ plant.name }}</h3>
            <p>{{ plant.species }}</p>
            <p>{{ plant.location }}</p>
          </NuxtLink>
        </template>

        <template #footer>
          <UButton color="primary" @click="deletePlant(plant.id)">Delete plant</UButton>
        </template>
      </BaseCard>
    </div>
  </section>
  <UButton to="/plants/create" icon="heroicons:plus" size="xl"
    class="fixed bottom-5 lg:bottom-10 right-5 lg:right-10 shadow-xl font-bold">Add
  </UButton>
</template>

<script setup lang="ts">
const { data: plants } = useFetch('/api/plants');

function deletePlant(id: string) {
  try {
    const response = $fetch(`/api/plants/${id}`, {
      method: 'DELETE'
    })
  } catch (e) {
    console.error(e)
  }
}
</script>