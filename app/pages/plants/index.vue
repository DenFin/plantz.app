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
        <div>
          <USelect v-model="columnCount" :items="columnOptions" />
        </div>
      </header>
      <div :class="columnClasses">
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
const { data: plants } = useFetch<ApiResponse<Plant[]>>('/api/plants', {
  server: true,
  lazy: false, // wichtig
  immediate: true, // fetch auch bei client nav
  default: () => ({ data: [] }),
})
const searchQuery = ref('')
const filteredPlants = computed(() => {
  if (searchQuery.value.length > 0) {
    return plants.value?.data.filter((plant) => {
      return plant.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || plant.species.toLowerCase().includes(searchQuery.value.toLowerCase()) || plant.location.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
  }
  else {
    return plants.value?.data
  }
})

/* ===================================
 * Columns
 =================================== */
const columnCount = ref(5)
const columnOptions = [3, 4, 5, 6, 7, 8]

const columnClasses = computed(() => {
  switch (columnCount.value) {
    case 3:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-3'
    case 4:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-4'
    case 5:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-5'
    case 6:
      return 'grid gap-4 lg:grid-cols-6'
    case 7:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-7'
    case 8:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-8 font-sm'
    default:
      return 'grid gap-2 lg:gap-4 lg:grid-cols-3'
  }
})
</script>
