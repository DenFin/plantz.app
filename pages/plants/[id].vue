<template>
  <section v-if="plant" >
    <div class="flex justify-between">
      <div class="flex gap-1  items-center mb-8">
        <NuxtLink to="/">
          <Icon name="heroicons-solid:home"/>
        </NuxtLink>
        <Icon name="heroicons:chevron-right"/>
        <NuxtLink to="/plants"><p class="font-bold">Plants</p></NuxtLink>
        <Icon name="heroicons:chevron-right"/>
        <p class="font-bold">{{ plant.data[0].name }}</p>
      </div>
    </div>

    <div class="grid md:grid-cols-[2fr,1fr] gap-8">
      <!-- Plant Info -->
      <div class="space-y-8">
        <h1 class="text-3xl font-bold">{{ plant.data[0].name }}</h1>
        <div class="p-8 bg-white rounded-xl shadow-lg flex flex-col gap-2">
          <p><span class="font-bold">Species:</span> {{ plant.data[0].species }}</p>
          <USeparator/>
          <p><span class="font-bold">Location: </span>{{ plant.data[0].location }}</p>
          <USeparator/>
          <p><span class="font-bold">Created: </span>{{ formatDate(plant.data[0].created_at) }}</p>
        </div>
      </div>

      <!-- Photos Section -->
      <div class="space-y-4 mb-8">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Photos</h2>
          <UButton icon="i-heroicons-camera" @click="showUploadModal = true">
            Add photo
          </UButton>
        </div>

        <!-- Photos Grid -->
        <div v-if="plant.data[0].photos?.[0]" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="photo in plant.data[0].photos" :key="photo.id" class="relative group aspect-square">
            <img 
              :src="photo.url" 
              :alt="`Photo of ${plant.data[0].name}`"
              class="w-full h-full object-cover rounded-lg shadow-md"
            />
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <UButton
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                size="xs"
                class="!text-white"
                @click="deletePhoto(photo.id)"
              />
            </div>
          </div>
        </div>
        
        <!-- No Photos State -->
        <div v-else class="bg-white rounded-xl shadow-lg p-6 text-center">
          <Icon name="i-heroicons-camera" class="w-8 h-8 mx-auto mb-3 text-gray-400"/>
          <p class="text-gray-500 text-sm">No photos yet</p>
          <UButton size="sm" icon="i-heroicons-camera" class="mt-3" @click="showUploadModal = true">
            Add first photo
          </UButton>
        </div>
      </div>
    </div>

    <!-- Upload Modal -->
    <UModal v-model="showUploadModal">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-bold">Add Photo</h3>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="showUploadModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UInput
            type="file"
            accept="image/*"
            class="w-full"
            :trailing-icon="previewUrl ? 'i-heroicons-check-circle' : 'i-heroicons-photo'"
            @input="handleFileChange"
          >
            <template #leading>
              <div class="sr-only">Choose file</div>
            </template>
          </UInput>
          <div v-if="previewUrl" class="mt-2">
            <img :src="previewUrl" alt="Preview" class="w-full aspect-video object-cover rounded-lg" />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="soft"
              @click="showUploadModal = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="isUploading"
              :disabled="!selectedFile"
              @click="uploadPhoto"
            >
              Upload Photo
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </section>
</template>

<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const id = route.params.id

const { data: plant, refresh } = useFetch(`/api/plants/${id}`)
const showUploadModal = ref(false)
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const isUploading = ref(false)

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0]
    previewUrl.value = URL.createObjectURL(input.files[0])
  } else {
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
      fileType: selectedFile.value.type
    })

    const response = await $fetch(`/api/plants/${id}/photos`, {
      method: 'POST',
      body: formData
    })
    
    console.log('Server response:', response)

    if (response?.data?.id) {
      toast.add({
        title: 'Photo uploaded successfully',
        color: 'success'
      })
      showUploadModal.value = false
      selectedFile.value = null
      previewUrl.value = ''
      refresh()
    } else {
      console.error('Invalid response structure:', response)
      throw new Error('Upload failed')
    }
  } catch (e) {
    console.error('Upload error details:', e)
    toast.add({
      title: 'Error uploading photo',
      color: 'error'
    })
  } finally {
    isUploading.value = false
  }
}

async function deletePhoto(photoId: string) {
  try {
    const response = await $fetch(`/api/plants/${id}/photos/${photoId}`, {
      method: 'DELETE'
    })

    if (response.status === 200) {
      toast.add({
        title: 'Photo deleted successfully',
        color: 'success'
      })
      refresh()
    }
  } catch (e) {
    toast.add({
      title: 'Error deleting photo',
      color: 'error'
    })
    console.error(e)
  }
}
</script>