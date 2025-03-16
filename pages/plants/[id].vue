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
<!--      <div>-->
<!--        <div class="bg-emerald-700 rounded-lg flex p-3 ">-->
<!--          <Icon class="bg-white h-5 w-5" name="heroicons:ellipsis-vertical-16-solid"></Icon>-->
<!--        </div>-->
<!--      </div>-->
    </div>
      <h1 class="text-3xl font-bold mb-2">{{ plant.data[0].name }}</h1>
    <div class="p-8 bg-white rounded-xl shadow-lg flex flex-col gap-2 mb-8">
      <p><span class="font-bold">Species:</span> {{ plant.data[0].species }}</p>
      <USeparator/>
      <p><span class="font-bold">Location: </span>{{ plant.data[0].location }}</p>
      <USeparator/>
      <p><span class="font-bold">Created: </span>{{ plant.data[0].created_at }}</p></div>
    <div>
      <UButton>Upload image</UButton>
    </div>
  </section>
</template>

<script setup lang="ts">

const route = useRoute()
const id = route.params.id

const { data: plant } = useFetch(`/api/plants/${id}`)

</script>