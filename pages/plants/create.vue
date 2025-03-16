<template>
  <section>
    <p class="font-bold mb-8">Add a plant</p>
    <form @submit.prevent="addPlant" class="bg-gray-50 p-8 rounded-xl flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <BaseLabel text="Name" />
        <UInput v-model="name" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Species" />
        <UInput v-model="species" />
      </div>
      <div class="flex flex-col gap-1">
        <BaseLabel text="Location" />
        <UInput v-model="location" />
      </div>
      <UButton type="submit" class="self-start">Submit</UButton>
    </form>
  </section>
</template>
<script setup lang="ts">
const toast = useToast()

const name = ref()
const species = ref()
const location = ref()

async function addPlant() {
  try {
    const response = await $fetch('/api/plants/', {
      method: 'POST',
      body: {
        name: name.value,
        species: species.value,
        location: location.value,
      }
    })
    if (response.status === 201) {
      name.value = ''
      species.value = ''
      location.value = ''
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
  }
}

</script>