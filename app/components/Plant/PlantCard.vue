<template>
  <NuxtLink
    :key="plant.id"
    class="block"
    :to="`/plants/${plant.id}`"
  >
    <BaseCard>
      <template #image>
        <!-- Plant Thumbnail -->
        <figure
          v-if="plant.thumbnail"
          class="bg-white w-full aspect-square overflow-hidden relative"
        >
          <NuxtImg
            :src="plant.thumbnail.url"
            :alt="`Photo of ${plant.name}`"
            class="w-full h-full object-cover"
          />
          <UBadge
            class="absolute top-2 right-2"
            color="neutral"
            variant="outline"
            :icon="getRoom(plant.room_id)?.icon"
          >{{ getRoom(plant.room_id)?.name }}
          </UBadge>
        </figure>
        <div
          v-else
          class="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center"
        >
          <Icon
            name="heroicons:photo"
            class="w-8 h-8 text-gray-400"
          />
        </div>
      </template>

      <template #default>
        <div class="flex justify-between">
          <div><h3 class="font-bold text-md lg:text-lg">{{ plant.name }}</h3>
            <p>{{ plant.species }}</p></div>
          <UPopover
            class="self-start"
            :content="{
              align: 'end',
              side: 'bottom',
              sideOffset: 8,
            }"
          >
            <UButton
              class="bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 cursor-pointer"
              icon="heroicons:ellipsis-vertical"
              color="neutral"
              variant="solid"
              @click.prevent
            />

            <template #content>
              <div class="p-2">
                <UButton
                  color="primary"
                  @click="deletePlant(plant.id)"
                >Delete plant
                </UButton>
              </div>
            </template>
          </UPopover>
        </div>
      </template>
    </BaseCard>
  </NuxtLink>
</template>

<script setup lang="ts">
type Props = {
  plant: Plant
}

defineProps<Props>()

const { many: rooms } = useRooms()
function getRoom(id: string): Room | undefined {
  return rooms.value?.find(room => room.id === id)
}

/* ===================================
 * Actions
 =================================== */
function deletePlant(id: string) {
  try {
    return $fetch(`/api/plants/${id}`, {
      method: 'DELETE',
    })
  }
  catch (e) {
    console.error(e)
  }
}
</script>
