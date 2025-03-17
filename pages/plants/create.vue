<template>
  <section>
    <div class="flex gap-1 items-center mb-4">
      <NuxtLink to="/">
        <Icon name="heroicons-solid:home" />
      </NuxtLink>
      <Icon name="heroicons:chevron-right" />
      <NuxtLink to="/plants"><p class="font-bold">Plants</p></NuxtLink>
      <Icon name="heroicons:chevron-right" />
      <p class="font-bold">Add a plant</p>
    </div>

    <form @submit.prevent="addPlant" class="bg-white shadow-xl p-8 rounded-xl flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <BaseLabel text="Name" />
        <UInput v-model="name" placeholder="Plant name" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Species" />
        <UInput v-model="species" placeholder="Plant species" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Location" />
        <UInput v-model="location" placeholder="Where is the plant located?" />
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
        <div v-if="previewUrl" class="mt-2">
          <NuxtImg :src="previewUrl" alt="Preview" class="w-32 h-32 object-cover rounded-lg" />
        </div>
      </div>
      <UButton type="submit" :loading="isSubmitting" class="self-start">
        {{ isSubmitting ? 'Creating plant...' : 'Submit' }}
      </UButton>
    </form>
  </section>
</template>

<script setup lang="ts">
const toast = useToast()

const name = ref('')
const species = ref('')
const location = ref('')
const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const isSubmitting = ref(false)

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

async function addPlant() {
  if (isSubmitting.value) return

  try {
    isSubmitting.value = true
    const formData = new FormData()
    formData.append('name', name.value)
    formData.append('species', species.value)
    formData.append('location', location.value)
    if (selectedFile.value) {
      formData.append('photo', selectedFile.value)
    }

    const response = await $fetch('/api/plants/', {
      method: 'POST',
      body: formData
    })

    if (response.status === 201) {
      name.value = ''
      species.value = ''
      location.value = ''
      selectedFile.value = null
      previewUrl.value = ''

      toast.add({
        title: 'Successfully created plant',
        color: 'success'
      })
      navigateTo('/plants')
    }
  } catch (e) {
    toast.add({
      title: 'Error creating a plant',
      color: 'error'
    })
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>