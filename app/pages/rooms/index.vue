<template>
  <div>
    <div
      v-if="rooms"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4"
    >
      <BaseCard v-for="room in rooms">
        <h3 class="font-bold text-md lg:text-lg">
          {{ room.name }}
        </h3>
        <p>Orientation: {{ room.orientation }}</p>
        <div>
          <UIcon :name="room.icon" />
        </div>
      </BaseCard>
    </div>
    <UButton
      to="/rooms/create"
      icon="heroicons:plus"
      size="xl"
      class="fixed bottom-5 lg:bottom-10 right-5 lg:right-10 shadow-xl font-bold"
    >
      Add
    </UButton>
  </div>
</template>

<script setup lang="ts">
const { many: rooms, fetchMany } = useRooms()

fetchMany()
</script>
