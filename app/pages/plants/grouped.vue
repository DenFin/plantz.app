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
      </header>
      <div class="w-full">
        <div v-for="(plantsInRoom, roomName) in groupedByRoomName" :key="roomName" class="mb-8">
          <h2 class="text-xl font-bold mb-2">
            {{ roomName }}
          </h2>
          <ul class="grid xl:grid-cols-6 gap-2">
            <li v-for="plant in plantsInRoom" :key="plant.id">
              <!-- beispielhafte Darstellung -->
              <PlantCard :plant="plant" />
            </li>
          </ul>
        </div>
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

/* ===================================
 * Rooms
 =================================== */
const { fetchMany: fetchRooms, many: rooms } = useRooms()
fetchRooms()

const roomMap = computed(() => {
  if (!rooms.value)
    return {}
  return Object.fromEntries(rooms.value.map(r => [r.id, r.name]))
})
const groupedByRoomId = computed(() =>
  Object.groupBy(plants.value?.data ?? [], p => p.room_id),
)

const groupedByRoomName = computed(() =>
  Object.fromEntries(
    Object.entries(groupedByRoomId.value).map(([roomId, plants]) => [
      roomMap.value[roomId] ?? `Unbekannt (${roomId})`,
      plants,
    ]),
  ),
)
</script>
