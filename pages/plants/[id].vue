<template>
  <section v-if="plant">
      <p>{{ plant.data[0].name }}</p>
      <p>{{ plant.data[0].species }}</p>
      <p>{{ plant.data[0].location }}</p>
  </section>
</template>

<script setup lang="ts">

const route = useRoute()
const id = route.params.id

const { data: plant } = useFetch(`/api/plants/${id}`)

</script>