<template>
  <div>
    <section
      v-if="plants"
      class="pb-20"
    >
      <header class="dark:text-gray-900 flex justify-between items-center mb-4">
        <div
          id="breadcrumbs"
          class="flex gap-1 items-center "
        >
          <NuxtLink
            class="flex items-center"
            to="/"
          >
            <Icon name="heroicons-solid:home" />
          </NuxtLink>
          <Icon name="heroicons:chevron-right" />
          <p class="font-bold">
            Plants
          </p>
        </div>
        <div>
          <UInput
            v-model="searchQuery"
            color="primary"
            placeholder="Search"
          />
        </div>
        <div />
      </header>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
        <PlantCard
          v-for="plant in filteredPlants"
          :key="plant.id"
          :plant="plant"
          class="block"
        />
      </div>
    </section>
    <UButton
      to="/plants/create"
      icon="heroicons:plus"
      size="xl"
      class="fixed bottom-5 lg:bottom-10 right-5 lg:right-10 shadow-xl font-bold"
    >
      Add
    </UButton>
  </div>
</template>

<script setup lang="ts">
/* ===================================
 * Plants fetching and filtering
 =================================== */
const { data: plants } = useFetch<ApiResponse<Plant[]>>('/api/plants')
const searchQuery = ref('')
const filteredPlants = computed(() => {
  if (searchQuery.value.length > 0) {
    return plants.value?.data.filter((plant) => {
      console.log(plant.name)
      console.log(searchQuery.value)
      return plant.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || plant.species.toLowerCase().includes(searchQuery.value.toLowerCase()) || plant.location.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
  }
  else {
    return plants.value?.data
  }
})

/* ===================================
 * Rooms
 =================================== */
const { fetchMany: fetchRooms } = useRooms()
fetchRooms()
</script>
