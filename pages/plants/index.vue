<template>
  <section v-if="plants">
    <p class="font-bold mb-8">Plants</p>
    <div class="grid grid-cols-3 gap-4">
      <BaseCard v-for="plant in plants.data">
        <NuxtLink :to="`/plants/${plant.id}`"><p>{{ plant.name }}</p>
          <p>{{ plant.species }}</p>
          <p>{{ plant.location }}</p></NuxtLink>
        <UButton @click="deletePlant(plant.id)">Delete plant</UButton>
      </BaseCard>
    </div>
  </section>
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