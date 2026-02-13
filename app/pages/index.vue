<template>
  <div class="flex flex-col gap-12">
    <section>
      <div class="flex gap-1 items-center mb-4">
        <NuxtLink
          class="flex items-center"
          to="/"
        >
          <Icon name="heroicons-solid:home" />
        </NuxtLink>
        <Icon name="heroicons:chevron-right" />
        <p class="font-bold">
          Dashboard
        </p>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <BaseCard v-if="plantCount">
          <div class="flex items-center flex-col gap-4">
            <div class="bg-emerald-100 p-4 rounded-full flex">
              <UIcon
                name="i-lucide-flower-2"
                class="bg-emerald-500 size-5"
              />
            </div>
            <div class="flex flex-col  text-center">
              <span class="font-bold text-5xl">{{ plantCount?.data[0].count }}</span>
              <span class="text-sm text-gray-500">Plants</span>
            </div>
          </div>
        </BaseCard>
        <BaseCard v-if="photosCount">
          <div class="flex items-center flex-col gap-4">
            <div class="bg-emerald-100 p-4 rounded-full flex">
              <UIcon
                name="i-lucide-camera"
                class="bg-emerald-500 size-5"
              />
            </div>
            <div class="flex flex-col  text-center">
              <span class="font-bold text-5xl">{{ photosCount?.data[0].count }}</span>
              <span class="text-sm text-gray-500">Photos</span>
            </div>
          </div>
        </BaseCard>
        <BaseCard v-if="roomsCount">
          <div class="flex items-center flex-col gap-4">
            <div class="bg-emerald-100 p-4 rounded-full flex">
              <UIcon
                name="ic:baseline-room"
                class="bg-emerald-500 size-5"
              />
            </div>
            <div class="flex flex-col  text-center">
              <span class="font-bold text-5xl">{{ roomsCount }}</span>
              <span class="text-sm text-gray-500">Rooms</span>
            </div>
          </div>
        </BaseCard>
        <BaseCard v-if="notes && !!notes?.data.length">
          <div class="flex items-center flex-col gap-4">
            <div class="bg-emerald-100 p-4 rounded-full flex">
              <UIcon
                name="material-symbols:note-outline-rounded"
                class="bg-emerald-500 size-5"
              />
            </div>
            <div class="flex flex-col  text-center">
              <span class="font-bold text-5xl">{{ notes.data.length }}</span>
              <span class="text-sm text-gray-500">Notes</span>
            </div>
          </div>
        </BaseCard>
      </div>
    </section>
    <section
      id="recent-notes"
      class="grid lg:grid-cols-2  gap-4"
    >
      <div v-if="recentNotes">
        <h2 class="font-bold text-xl mb-3">
          Recent notes
        </h2>
        <div
          v-if="recentNotes.length"
          class="flex flex-col gap-3"
        >
          <BaseCard
            v-for="note in recentNotes"
            :key="note.id"
          >
            <p
              v-if="note.created_at"
              class="text-xs mb-3"
            >
              {{ formatDate(note.created_at) }}
            </p>
            <NuxtLink
              :to="`/plants/${note.plant_id}`"
              class="font-bold"
            >
              {{
                getPlantById(note.plant_id)?.name
              }}
            </NuxtLink>
            <p class="">
              {{ note.content }}
            </p>
          </BaseCard>
        </div>
        <div
          v-else
          class="bg-emerald-200 rounded-lg p-4"
        >
          <p>You currently do not have any recent notes. Go to your plants and take a note!</p>
          <nuxt-link
            to="/plants"
            class="mt-4 flex items-center"
          >
            <Icon name="material-symbols:chevron-right-rounded" />
            <span class="font-bold">Go to plants</span>
          </nuxt-link>
        </div>
      </div>

      <div v-if="recentPhotos">
        <h2 class="font-bold text-xl mb-3">
          Recent photos
        </h2>
        <div
          v-if="recentPhotos.length"
          class="grid grid-cols-3 gap-3"
        >
          <figure
            v-for="(photo, index) in recentPhotos"
            :key="photo.id"
            class="rounded-lg aspect-square overflow-hidden cursor-pointer relative group"
            @click="openPhotoInLightbox(index)"
          >
            <NuxtImg
              class="h-full w-full object-cover"
              :src="photo.image_url"
            />
            <div
              class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center"
            >
              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-magnifying-glass-plus"
                size="xs"
                class="cursor-pointer !text-white"
              />
            </div>
          </figure>
        </div>
        <div
          v-else
          class="bg-emerald-200 rounded-lg p-4"
        >
          <p>You currently do not have any recent photos. Go to your plants and take a photos!</p>
          <nuxt-link
            to="/plants"
            class="mt-4 flex items-center"
          >
            <Icon name="material-symbols:chevron-right-rounded" />
            <span class="font-bold">Go to plants</span>
          </nuxt-link>
        </div>
      </div>
      <PlantLightbox
        ref="lightboxRef"
        v-model="showLightbox"
        :photos="recentPhotos || []"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Dashboard',
})
definePageMeta({
  title: 'Dashboard',
})
// TODO: Refactor to composables
const { data: plantCount } = useFetch('/api/plants/count', { lazy: true })
const { data: photosCount } = useFetch('/api/plants/photos', { lazy: true })
const { data: notes } = useFetch<ApiResponse<Plant[]>>('/api/notes', { lazy: true })

const { getPlantById, fetchMany: fetchPlants } = usePlants()
fetchPlants()

const { count: roomsCount, fetchMany: fetchRooms } = useRooms()
fetchRooms()

const { recent: recentNotes, fetchRecent: fetchRecentNotes } = useNotes()
fetchRecentNotes()

const { recent: recentPhotos, fetchRecent: fetchRecentPhotos } = usePhotos()
fetchRecentPhotos()

const lightboxRef = ref<InstanceType<typeof PlantLightbox> | null>(null)
const showLightbox = ref(false)

function openPhotoInLightbox(index: number) {
  lightboxRef.value?.open(index)
}
</script>
