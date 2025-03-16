<template>

  <section v-if="plants">
    <div>
      <div class="flex gap-1 items-center mb-4">
        <NuxtLink to="/">
          <Icon name="heroicons-solid:home" />
        </NuxtLink>
        <Icon name="heroicons:chevron-right" />
        <p class="font-bold">Plants</p>
      </div>
    </div>


    <div class="grid grid-cols-3 gap-4">
      <BaseCard v-for="plant in plants.data">
        <NuxtLink class="block mb-4" :to="`/plants/${plant.id}`">
          <h3 class="font-bold text-lg">{{ plant.name }}</h3>
          <p>{{ plant.species }}</p>
          <p>{{ plant.location }}</p>
        </NuxtLink>
        <UButton color="primary" @click="deletePlant(plant.id)">Delete plant</UButton>
      </BaseCard>
    </div>
  </section>
  <UButton to="/plants/create" icon="heroicons:plus" size="xl" class="fixed bottom-10 right-10 shadow-xl font-bold">Add</UButton>
</template>

<script setup lang="ts">

const { data: plants } = useFetch('/api/plants');

async function deletePlant(id: string) {
  try {
    const response = $fetch(`/api/plants/${id}`, {
      method: 'DELETE'
    })
  } catch (e) {
    console.error(e)
  }
}

</script>