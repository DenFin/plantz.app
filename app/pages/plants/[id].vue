<template>
  <div
    v-if="plant && plant.data && plant.data[0]"
    class="flex flex-col gap-8"
  >
    <!-- Breadcrumbs -->
    <section id="breadcrumbs">
      <div class="flex justify-between items-center text-gray-800">
        <div class="flex gap-1  items-center">
          <NuxtLink to="/">
            <Icon name="heroicons-solid:home" />
          </NuxtLink>
          <Icon name="heroicons:chevron-right" />
          <NuxtLink to="/plants">
            <p class="font-bold">Plants</p>
          </NuxtLink>
          <Icon name="heroicons:chevron-right" />
          <p class="font-bold">
            {{ plant.data[0].name }}
          </p>
        </div>
        <div
          v-if="false"
          class="bg-emerald-700 flex p-2 rounded-lg cursor-pointer hover:bg-emerald-600 transition-colors duration-200"
        >
          <UIcon
            class="bg-emerald-100 w-5 h-5"
            name="i-heroicons:ellipsis-vertical"
          />
        </div>
      </div>
    </section>
    <!-- Content -->
    <section>
      <div class="flex flex-col lg:flex-row gap-8">
        <div class="self-start w-full lg:basis-1/2 flex flex-col gap-3">
          <BaseCard>
            <h1 class="text-3xl font-bold mb-8">
              {{ plant.data[0].name }}
            </h1>
            <div class="flex flex-col gap-2 mb-8">
              <p><span class="font-bold">Species:</span> {{ plant.data[0].species }}</p>
              <USeparator />
              <p><span class="font-bold">Room: </span>{{ getRoomById(plant.data[0].room_id)?.name }}</p>
              <USeparator />
              <p><span class="font-bold">Room orientation: </span>{{ getRoomById(plant.data[0].room_id)?.orientation }}</p>
              <USeparator />
              <p><span class="font-bold">Location: </span>{{ plant.data[0].location }}</p>
              <USeparator />
              <p><span class="font-bold">Created: </span>{{ formatDate(plant.data[0].created_at) }}</p>
            </div>
            <div class="flex gap-1.5">
              <!-- Reminder -->
              <div>
                <UModal v-model:open="isReminderModalOpen">
                  <UButton
                      leading-icon="material-symbols:alarm-outline-rounded"
                      label="Add a reminder"
                      color="primary"
                      variant="solid"
                  />
                  <template #content>
                    <form
                        class="p-8 flex flex-col gap-3 items-start"
                        @submit.prevent="addReminder"
                    >
                      <div class="flex flex-col gap-1 w-full">
                        <BaseLabel text="Reminder" />
                        <UTextarea
                            v-model="message"
                            class="w-full"
                            placeholder="Enter a message"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <BaseLabel text="Remind at" />
                        <UInput
                            type="date"
                            accept="image/*"
                            class="w-full"
                            v-model="remindAt"
                        />

                      </div>
                      <UButton
                          type="submit"
                          leading-icon="material-symbols:note-outline-rounded"
                          label="Save reminder"
                          color="primary"
                          variant="solid"
                      />
                    </form>
                  </template>
                </UModal>
              </div>
              <!-- Note -->
              <div>
                <UModal v-model:open="isNoteModalOpen">
                  <UButton
                      leading-icon="material-symbols:note-outline-rounded"
                      label="Add note"
                      color="primary"
                      variant="solid"
                  />
                  <template #content>
                    <form
                        class="p-8 flex flex-col gap-3 items-start"
                        @submit.prevent="insertNote"
                    >
                      <div class="flex flex-col gap-1 w-full">
                        <BaseLabel text="Note" />
                        <UTextarea
                            v-model="note"
                            class="w-full"
                            placeholder="Enter a note"
                        />
                      </div>
                      <div class="flex flex-col gap-1">
                        <BaseLabel text="Photo" />
                        <UInput
                            type="file"
                            accept="image/*"
                            class="w-full"
                            :trailing-icon="previewUrl ? 'i-heroicons-check-circle' : 'i-heroicons-photo'"
                            @input="handleFileChange"
                        />
                        <div
                            v-if="previewUrl"
                            class="mt-2"
                        >
                          <NuxtImg
                              :src="previewUrl"
                              alt="Preview"
                              class="w-32 h-32 object-cover rounded-lg"
                          />
                        </div>
                      </div>
                      <UButton
                          type="submit"
                          leading-icon="material-symbols:note-outline-rounded"
                          label="Save note"
                          color="primary"
                          variant="solid"
                      />
                    </form>
                  </template>
                </UModal>
              </div>
            </div>
          </BaseCard>
          <BaseCard v-for="note in plant.data[0].notes">
            <div class="flex">
              <div class="basis-full flex justify-center flex-col">
                <p class="text-xs">
                  {{ formatDate(note.created_at) }}
                </p>
                <h2 class="font-bold">
                  {{ note.content }}
                </h2>
              </div>
              <figure
                v-if="!!getPhotoAttachedToNote(note.id)?.url"
                class="basis-1/6 aspect-square overflow-hidden rounded-lg ml-2"
              >
                <img
                  class="h-full w-full object-cover"
                  :src="getPhotoAttachedToNote(note.id)?.url"
                  alt=""
                >
              </figure>
            </div>
          </BaseCard>

        </div>
        <div class="basis-full lg:basis-1/2">
          <!-- Photos Section -->
          <div class="space-y-4 mb-8">
            <!-- Photos Grid -->
            <div
              class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3"
            >
              <div
                class="bg-emerald-200 hover:bg-emerald-300 transition-colors aspect-square rounded-lg overflow-hidden p-2 cursor-pointer relative"
              >
                <div class="aspect-square border-1 border-dashed rounded-lg flex items-center justify-center">
                  <div v-if="!showUploadButton">
                    <input
                      accept="image/*"
                      type="file"
                      class="opacity-0 absolute top-0 right-0 bottom-0 left-0 z-20 cursor-pointer"
                      @input="handleFileChange"
                    >
                    <div>
                      <div class="flex items-center justify-center flex-col">
                        <div>
                          <UIcon
                            name="i-lucide-camera"
                            class="size-5"
                          />
                        </div>
                        <span class="text-xs">Add photo</span>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <UButton
                      :loading="isUploading"
                      :disabled="!selectedFile"
                      @click="uploadPhoto"
                    >
                      Upload Photo
                    </UButton>
                  </div>
                </div>
              </div>
              <div
                v-for="(photo, index) in plant.data[0].photos"
                v-if="plant.data[0].photos && plant.data[0].photos.length > 0"
                :key="photo.id"
                class="relative group aspect-square"
              >
                <NuxtImg
                  v-if="photo"
                  :src="photo.url"
                  :alt="`Photo of ${plant.data[0].name}`"
                  class="w-full h-full object-cover rounded-lg shadow-md"
                />
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                  @click="openPhotoInLightbox(index)"
                >
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-magnifying-glass-plus"
                    size="xs"
                    class="cursor-pointer !text-white"
                  />
                  <UBadge
                    class="absolute bottom-2"
                    color="neutral"
                  >
                    {{ formatDate(photo.taken_at) }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- PlantLightbox -->
    <div
      v-if="showLightbox"
      class="fixed z-40 bg-black/80 backdrop-blur-xs top-0 left-0 right-0 bottom-0 flex flex-col justify-center items-center p-4 xl:p-20"
      @click.self="closeLightbox"
    >
      <div
        class="h-full max-h-screen relative flex items-center"
        @click.self="closeLightbox"
      >
        <div class="absolute flex w-full justify-between">
          <div class="bg-white p-1 flex rounded-lg  ">
            <UIcon
              name="i-heroicons:chevron-left"
              size="xs"
              class="w-8 h-8 text-gray-900 cursor-pointer"
              @keydown.left="previousPhoto"
              @click="previousPhoto"
            />
          </div>
          <div class="bg-white p-1 flex rounded-lg">
            <UIcon
              name="i-heroicons:chevron-right"
              size="xs"
              class="w-8 h-8 text-gray-900 cursor-pointer"
              @keyup.left="nextPhoto"
              @click="nextPhoto"
            />
          </div>
        </div>
        <div class="bg-white p-3 rounded-lg absolute bottom-2 -translate-x-1/2 left-1/2 flex items-center gap-3">
          <span>{{ formatDate(plant.data[0].photos[lightboxPhotoIndex]?.taken_at) }}</span>
          <UButton
            :loading="isAnalyzing"
            :disabled="isAnalyzing"
            icon="i-heroicons-sparkles"
            color="primary"
            variant="solid"
            size="sm"
            @click="analyzePhotoWithAI"
          >
            KI-Analyse
          </UButton>
        </div>
        <NuxtImg
          class="h-auto max-h-full w-auto rounded-lg overflow-hidden"
          :src="lightboxPhotoUrl"
        />
      </div>
    </div>
    <!-- AI Analysis Modal -->
    <UModal v-model:open="showAIAnalysisModal">
      <template #content>
        <div class="p-8 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">KI-Analyse</h2>
          </div>
          <div
            v-if="aiAnalysis"
            class="bg-gray-50 p-4 rounded-lg"
          >
            <p class="whitespace-pre-wrap">{{ aiAnalysis }}</p>
          </div>
          <div
            v-else-if="aiAnalysisError"
            class="bg-red-50 p-4 rounded-lg text-red-800"
          >
            <p>{{ aiAnalysisError }}</p>
          </div>
          <UButton
            color="primary"
            variant="solid"
            @click="showAIAnalysisModal = false"
          >
            Schließen
          </UButton>
        </div>
      </template>
    </UModal>
    <!-- PlantEditModal -->
    <UModal v-model:open="showPlantEditModal">
      <UButton
        icon="heroicons:pencil"
        size="xl"
        class="fixed bottom-5 lg:bottom-10 right-5 lg:right-10 shadow-xl font-bold cursor-pointer"
      >
        Edit
      </UButton>
      <template #content>
        <form
          class="p-8 flex flex-col gap-4"
          @submit.prevent="editPlant"
        >
          <div class="flex flex-col gap-1">
            <BaseLabel text="Name" />
            <UInput
              v-model="plantToEdit.name"
              placeholder="Plant name"
            />
          </div>
          <div class="flex flex-col gap-1">
            <BaseLabel text="Species" />
            <UInput
              v-model="plantToEdit.species"
              placeholder="Plant species"
            />
          </div>
          <div class="flex flex-col gap-1">
            <BaseLabel text="Location" />
            <UInput
              v-model="plantToEdit.location"
              placeholder="Where is the plant located?"
            />
          </div>
          <div
            v-if="rooms"
            class="flex flex-col gap-1"
          >
            <BaseLabel text="Room" />
            <USelect
              v-model="plantToEdit.room_id"
              :items="rooms"
              label-key="name"
              value-key="id"
              placeholder="Where is the plant located?"
            />
          </div>
          <UButton
            type="submit"
            :loading="isUpdating"
            class="self-start"
          >
            {{ isUpdating ? 'Updating plant...' : 'Submit' }}
          </UButton>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useMagicKeys } from '@vueuse/core'

const route = useRoute()
const toast = useToast()
const id = route.params.id

const { data: plant, refresh } = await useFetch(`/api/plants/${id}`)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const isUploading = ref(false)
const showUploadModal = ref(false)

const { many: rooms, fetchMany: fetchRooms, getRoomById } = useRooms()
fetchRooms()

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const showUploadButton = ref(false)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0]
    previewUrl.value = URL.createObjectURL(input.files[0])
    showUploadButton.value = true
  }
  else {
    selectedFile.value = null
    previewUrl.value = ''
  }
}

async function uploadPhoto() {
  if (!selectedFile.value) return

  try {
    isUploading.value = true
    const formData = new FormData()
    formData.append('photo', selectedFile.value)

    console.log('Uploading photo:', {
      fileName: selectedFile.value.name,
      fileSize: selectedFile.value.size,
      fileType: selectedFile.value.type,
    })

    const response = await $fetch(`/api/plants/${id}/photos`, {
      method: 'POST',
      body: formData,
    })

    console.log('Server response:', response)

    if (response?.data?.id) {
      toast.add({
        title: 'Photo uploaded successfully',
        color: 'success',
      })
      showUploadModal.value = false
      showUploadButton.value = false
      selectedFile.value = null
      previewUrl.value = ''
      refresh()
    }
    else {
      console.error('Invalid response structure:', response)
      toast.add({
        title: 'Error uploading photo',
        color: 'error',
      })
    }
  }
  catch (e) {
    console.error('Upload error details:', e)
    toast.add({
      title: 'Error uploading photo',
      color: 'error',
    })
  }
  finally {
    isUploading.value = false
  }
}

async function deletePhoto(photoId: string) {
  try {
    const response = await $fetch(`/api/plants/${id}/photos/${photoId}`, {
      method: 'DELETE',
    })

    if (response.status === 200) {
      toast.add({
        title: 'Photo deleted successfully',
        color: 'success',
      })
      refresh()
    }
  }
  catch (e) {
    toast.add({
      title: 'Error deleting photo',
      color: 'error',
    })
    console.error(e)
  }
}

const showLightbox = ref(false)
const lightboxPhotoIndex = ref(0)

function closeLightbox() {
  showLightbox.value = false
  lightboxPhotoIndex.value = 0
}

function openPhotoInLightbox(index: number) {
  showLightbox.value = true
  lightboxPhotoIndex.value = index
}

function nextPhoto() {
  if (lightboxPhotoIndex.value + 1 === plant.value.data[0].photos.length) {
    lightboxPhotoIndex.value = 0
  }
  else {
    lightboxPhotoIndex.value++
  }
}

function previousPhoto() {
  if (lightboxPhotoIndex.value === 0) {
    lightboxPhotoIndex.value = plant.value.data[0].photos.length - 1
  }
  else {
    lightboxPhotoIndex.value--
  }
}

const lightboxPhotoUrl = computed<string>(() => {
  return plant?.value?.data?.[0]?.photos?.[lightboxPhotoIndex.value]?.url
})

const isNoteModalOpen = ref(false)
const note = ref('')
async function insertNote() {
  try {
    const formData = new FormData()
    formData.append('plant_id', id)
    formData.append('note', note.value)
    if (selectedFile.value) {
      formData.append('photo', selectedFile.value)
    }
    console.log('Uploading photo:', formData)
    const response = await $fetch('/api/notes', {
      method: 'POST',
      body: formData,
      onResponse: (response) => {
        toast.add({
          title: 'Successfully inserted note.',
        })
        isNoteModalOpen.value = false
        refresh()
        console.log(response)
        switch (response.response?.status) {
          case 200:
            console.log('200')
            break
          case 201:
            console.log('201')
            break
          case 400:
            console.log('400')
        }
      },
    })
  }
  catch (e) {
    console.error(e)
  }
}

const plantToEdit = ref({
  id: plant.value?.data?.[0]?.id,
  name: plant.value?.data?.[0]?.name,
  species: plant.value?.data?.[0]?.species,
  location: plant.value?.data?.[0]?.location,
  room_id: plant.value?.data?.[0]?.room_id,
})

watch(plant, (newVal, oldVal) => {
  plantToEdit.value = {
    id: plant.value?.data?.[0]?.id,
    name: plant.value?.data?.[0]?.name,
    species: plant.value?.data?.[0]?.species,
    location: plant.value?.data?.[0]?.location,
    room_id: plant.value?.data?.[0]?.room_id,
  }
})

const { left, right, escape } = useMagicKeys()
watch(left, (v) => {
  if (v)
    previousPhoto()
})

watch(right, (v) => {
  if (v) nextPhoto()
})

watch(escape, (v) => {
  if (v) showLightbox.value = false
})

const showPlantEditModal = ref(false)
const isUpdating = ref(false)
async function editPlant() {
  try {
    await $fetch(`/api/plants/${id}`, {
      method: 'PUT',
      body: plantToEdit.value,
      onResponse: (response) => {
        if (response.response?.status === 200) {
          toast.add({
            title: 'Successfully edited plant',
          })
          refresh()
          showPlantEditModal.value = false
        }
      },
    })
  }
  catch (error) {
    console.error(error)
  }
}

function getPhotoAttachedToNote(noteId: string) {
  return plant.value.data[0].photos.find(photo => photo.note_id === noteId)
}

const isReminderModalOpen  = ref(false)

const message = ref('')
const remindAt = ref(null)

async function addReminder() {
  console.log('message', message.value)
  console.log('remindAt', remindAt.value)
}

const isAnalyzing = ref(false)
const showAIAnalysisModal = ref(false)
const aiAnalysis = ref('')
const aiAnalysisError = ref('')

async function analyzePhotoWithAI() {
  if (!plant.value?.data?.[0]?.photos?.[lightboxPhotoIndex.value]) {
    toast.add({
      title: 'Kein Foto gefunden',
      color: 'error',
    })
    return
  }

  const photo = plant.value.data[0].photos[lightboxPhotoIndex.value]
  if (!photo.id) {
    toast.add({
      title: 'Foto-ID nicht gefunden',
      color: 'error',
    })
    return
  }

  try {
    isAnalyzing.value = true
    aiAnalysisError.value = ''
    aiAnalysis.value = ''
    showAIAnalysisModal.value = true

    const response = await $fetch(`/api/plants/${id}/photos/${photo.id}/analyze`, {
      method: 'POST',
    })

    if (response?.data?.analysis) {
      aiAnalysis.value = response.data.analysis
    }
    else {
      aiAnalysisError.value = 'Keine Antwort von der KI erhalten'
    }
  }
  catch (error: any) {
    console.error('Error analyzing photo:', error)
    aiAnalysisError.value = error?.data?.error || 'Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.'
    toast.add({
      title: 'Fehler bei der KI-Analyse',
      color: 'error',
    })
  }
  finally {
    isAnalyzing.value = false
  }
}

</script>
