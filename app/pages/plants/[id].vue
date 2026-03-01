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
            <p class="font-bold">
              Plants
            </p>
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
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
        <div class="order-2 lg:order-1 space-y-4 overflow-x-hidden">
          <div class="flex flex-wrap lg:flex-row lg:flex-nowrap gap-2 w-full">
            <div :class="!!plant.data?.[0]?.parent_plant_id ? 'basis-full lg:basis-2/3' : 'basis-full'">
              <BaseCard class="w-full">
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
                  <!-- Reminder and Note Buttons -->
                  <!-- (Rest of the buttons remain the same) -->
                </div>
              </BaseCard>
            </div>
            <!-- PARENT PLANT -->
            <PlantCard v-if="plant.data?.[0]?.parent_plant_id" class="lg:basis-1/3" :plant="getPlantById(plant?.data?.[0]?.parent_plant_id)" />
          </div>

          <!-- NOTES -->
          <div class="space-y-4">
            <BaseCard v-for="note in plant.data?.[0].notes" :key="note?.id">
              <div class="flex flex-col">
                <div class="flex">
                  <div class="basis-full flex justify-center flex-col">
                    <p class="text-xs">
                      {{ formatDate(note.created_at) }}
                    </p>
                    <h2 class="font-bold">
                      {{ note.content }}
                    </h2>
                  </div>
                </div>
                <div 
                  v-if="getPhotosAttachedToNote(note?.id).length > 0" 
                  class="overflow-x-auto mt-2"
                >
                  <div class="flex gap-2 pb-2">
                    <figure
                      v-for="(photo, index) in getPhotosAttachedToNote(note?.id)"
                      :key="photo?.id"
                      class="aspect-square w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg"
                      @click="openPhotoInLightbox(
                        plant.data[0].photos.findIndex(p => p.id === photo?.id)
                      )"
                    >
                      <img
                        class="h-full w-full object-cover cursor-pointer"
                        :src="photo?.url"
                        alt=""
                      >
                    </figure>
                  </div>
                </div>
              </div>
            </BaseCard>
          </div>

          <!-- CHILDREN -->
          <div v-if="!!plant.children.length" class="grid gap-2 grid-cols-1 lg:grid-cols-3">
            <PlantCard v-for="child in plant.children" :key="child?.id" class="basis-1/3" :plant="child" />
          </div>
        </div>
        
        <div class="order-1 lg:order-2 w-full">
          <!-- Photos Section -->
          <div class="space-y-4 mb-8">
            <!-- Photos Grid -->
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <div
                class="bg-emerald-200 hover:bg-emerald-300 transition-colors aspect-square rounded-lg overflow-hidden p-2 cursor-pointer relative"
              >
                <div class="aspect-square border-1 border-dashed rounded-lg flex items-center justify-center">
                  <div v-if="!showUploadButton">
                    <input
                      id="photo-upload"
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
                :key="photo?.id"
                class=""
              >
                <div class="bg-gray-50 rounded-lg relative group aspect-square shadow-md rounded overflow-hidden">
                  <NuxtImg
                    v-if="photo"
                    :src="photo.url"
                    :alt="`Photo of ${plant.data[0].name}`"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div
                    class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                    @click.right="openContextMenu($event, plant.data[0].id)"
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
      </div>
    </section>
    <PlantLightbox
      ref="lightboxRef"
      v-model="showLightbox"
      :photos="plant.data[0].photos"
      image-url-key="url"
      :show-analyze-button="true"
      @close="closeLightbox"
      @analyze="handleAnalyze"
    />
    <!-- AI Analysis Modal -->
    <UModal v-model:open="showAIAnalysisModal">
      <template #content>
        <div class="p-8 flex flex-col gap-4">
          <div v-if="false" class="flex items-center gap-2">
            <UIcon name="i-heroicons-sparkles" class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">
              KI-Analyse
            </h2>
          </div>
          <div
            v-if="aiAnalysis"
            class="bg-gray-50 p-4 rounded-lg"
          >
            <p class="whitespace-pre-wrap">
              {{ aiAnalysis }}
            </p>
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
          <div
            v-if="plants"
            class="flex flex-col gap-1"
          >
            <BaseLabel text="Parent Plant" />
            <USelect
              v-model="plantToEdit.parent_plant_id"
              :items="plants"
              label-key="name"
              value-key="id"
              placeholder="Does the plant have a parent?"
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
import type { Plants } from '~~/db-types'

const route = useRoute()
const toast = useToast()
const id = route.params?.id

const { data: plant, refresh } = await useFetch <ApiResponse<Plants[]>>(`/api/plants/${id}`)
const selectedFile = ref<File | null>(null)
const noteFiles = ref<File[]>([])
const notePreviewUrls = ref<string[]>([])
const previewUrl = ref('')
const isUploading = ref(false)
const showUploadModal = ref(false)

const { many: plants, fetchMany: fetchPlants, getPlantById } = usePlants()
fetchPlants()
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
  if (input.files && input.files.length > 0) {
    // Handle standalone photo upload
    if (event.currentTarget?.closest('#photo-upload')) {
      selectedFile.value = input.files[0]
      previewUrl.value = URL.createObjectURL(input.files[0])
      showUploadButton.value = true
    }
    // Handle note file upload
    else if (event.currentTarget?.closest('#note-photo-upload')) {
      const newFiles = Array.from(input.files)
      noteFiles.value = [...noteFiles.value, ...newFiles]
      
      // Generate preview URLs for new files
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file))
      notePreviewUrls.value = [...notePreviewUrls.value, ...newPreviewUrls]
      
      // Reset the file input
      input.value = ''
    }
  }
}

function removeNoteImage(index: number) {
  noteFiles.value.splice(index, 1)
  notePreviewUrls.value.splice(index, 1)
}

async function uploadPhoto() {
  if (!selectedFile.value)
    return

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

const lightboxRef = ref<InstanceType<typeof PlantLightbox> | null>(null)
const showLightbox = ref(false)

function closeLightbox() {
  showLightbox.value = false
}

function openPhotoInLightbox(index: number) {
  lightboxRef.value?.open(index)
}

function handleAnalyze(photo: any) {
  analyzePhotoWithAI(photo?.id)
}

const isNoteModalOpen = ref(false)
const note = ref('')
async function insertNote() {
  try {
    const formData = new FormData()
    formData.append('plant_id', id)
    formData.append('note', note.value)
    
    // Append all note files
    noteFiles.value.forEach((file, index) => {
      formData.append('photo', file)
    })

    console.log('Uploading note with photos:', formData)
    const response = await $fetch('/api/notes', {
      method: 'POST',
      body: formData,
      onResponse: (response) => {
        toast.add({
          title: 'Successfully inserted note.',
        })
        
        // Reset everything
        isNoteModalOpen.value = false
        note.value = ''
        noteFiles.value = []
        notePreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
        notePreviewUrls.value = []
        
        refresh()
        
        console.log(response)
        switch (response.response?.status) {
          case 200:
          case 201:
            break
          case 400:
            toast.add({
              title: 'Error inserting note',
              color: 'error'
            })
            break
        }
      },
    })
  }
  catch (e) {
    console.error(e)
    toast.add({
      title: 'Error inserting note',
      color: 'error'
    })
  }
}

const plantToEdit = ref({
  id: plant.value?.data?.[0]?.id,
  name: plant.value?.data?.[0]?.name,
  parent_plant_id: plant.value?.data?.[0]?.parent_plant_id,
  species: plant.value?.data?.[0]?.species,
  location: plant.value?.data?.[0]?.location,
  room_id: plant.value?.data?.[0]?.room_id,
})

watch(plant, (newVal, oldVal) => {
  plantToEdit.value = {
    id: plant.value?.data?.[0]?.id,
    name: plant.value?.data?.[0]?.name,
    parent_plant_id: plant.value?.data?.[0]?.parent_plant_id,
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
  if (v)
    nextPhoto()
})

watch(escape, (v) => {
  if (v)
    showLightbox.value = false
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

function getPhotosAttachedToNote(noteId: string) {
  return plant.value.data[0].photos.filter(photo => photo.note_id === noteId)
}

const isReminderModalOpen = ref(false)

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

async function analyzePhotoWithAI(photoId?: string) {
  if (!photoId) {
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

    const response = await $fetch(`/api/plants/${id}/photos/${photoId}/analyze`, {
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

function openContextMenu(event, planId) {
  console.log(event)
  event.preventDefault()
  console.log(plantId)
}
</script>
