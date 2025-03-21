<template>
  <section>
    <div class="flex gap-1 items-center mb-4">
      <NuxtLink to="/">
        <Icon name="heroicons-solid:home" />
      </NuxtLink>
      <Icon name="heroicons:chevron-right" />
      <NuxtLink to="/rooms"><p class="font-bold">Rooms</p></NuxtLink>
      <Icon name="heroicons:chevron-right" />
      <p class="font-bold">Add a room</p>
    </div>

    <form @submit.prevent="addRoom" class="bg-white shadow-xl p-8 rounded-xl flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <BaseLabel text="Name" />
        <UInput v-model="name" placeholder="Room name" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Color" />
        <input type="color" v-model="color" placeholder="Room name" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Icon" />
        <UInput v-model="icon" placeholder="Room name" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Orientation" />
        <UInput v-model="orientation" placeholder="Room name" />
      </div>
      <UButton type="submit" :loading="isSubmitting" class="self-start">
        {{ isSubmitting ? 'Creating room...' : 'Submit' }}
      </UButton>
    </form>
  </section>
</template>

<script setup lang="ts">
const toast = useToast()

const name = ref('')
const color = ref('')
const icon = ref('')
const orientation =ref('')
const previewUrl = ref('')
const isSubmitting = ref(false)


async function addRoom() {
  if (isSubmitting.value) return

  try {
    isSubmitting.value = true
    const formData = new FormData()
    formData.append('name', name.value)
    formData.append('color', color.value)
    formData.append('icon', icon.value)
    formData.append('orientation', orientation.value)

    const response = await $fetch('/api/rooms/', {
      method: 'POST',
      body: formData
    })

    if (response.status === 201) {
      name.value = ''
      color.value = ''
      icon.value = ''
      orientation.value = ''
      previewUrl.value = ''

      toast.add({
        title: 'Successfully created room',
        color: 'success'
      })
      navigateTo('/rooms')
    }
  } catch (e) {
    toast.add({
      title: 'Error creating a room',
      color: 'error'
    })
    console.error(e)
  } finally {
    isSubmitting.value = false
  }
}
</script>