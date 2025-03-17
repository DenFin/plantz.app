<template>
  <section>
    <div class="flex gap-1 items-center mb-4">
      <NuxtLink class="flex items-center" to="/">
        <Icon name="heroicons-solid:home" />
      </NuxtLink>
      <Icon name="heroicons:chevron-right" />
      <p class="font-bold">Dashboard</p>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <BaseCard>
        <BaseHeadline element="h2" text="System Status" class="mb-4" />
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <Icon v-if="dbStatus === 'connected'" name="heroicons:check-circle" class="w-6 h-6 text-emerald-500" />
            <Icon v-if="dbStatus === 'error'" name="heroicons:x-circle" class="w-6 h-6 text-red-500" />
            <span class="font-medium">Database Connection</span>
            <UBadge v-if="dbStatus === 'connected'" color="success" variant="subtle">Connected</UBadge>
            <UBadge v-if="dbStatus === 'error'" color="danger" variant="subtle">Error</UBadge>
          </div>
          <div class="flex items-center gap-2">
            <Icon v-if="minioStatus === 'connected'" name="heroicons:check-circle" class="w-6 h-6 text-emerald-500" />
            <Icon v-if="minioStatus === 'error'" name="heroicons:x-circle" class="w-6 h-6 text-red-500" />
            <span class="font-medium">Minio Connection</span>
            <UBadge v-if="minioStatus === 'connected'" color="success" variant="subtle">Connected</UBadge>
            <UBadge v-if="minioStatus === 'error'" color="danger" variant="subtle">Error</UBadge>
          </div>
        </div>
      </BaseCard>
      <BaseCard v-if="plantCount">
        <div class="flex items-center flex-col gap-4">
          <div class="bg-emerald-100 p-4 rounded-full flex">
            <UIcon name="i-lucide-flower-2" class="bg-emerald-500 size-5" />
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
            <UIcon name="i-lucide-camera" class="bg-emerald-500 size-5" />
          </div>
          <div class="flex flex-col  text-center">
            <span class="font-bold text-5xl">{{ photosCount?.data[0].count }}</span>
            <span class="text-sm text-gray-500">Photos</span>
          </div>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const dbStatus = ref('');
const minioStatus = ref('');

const { data: plantCount } = useFetch('/api/plants/count')
const { data: photosCount } = useFetch('/api/plants/photos')

async function fetchDbStatus() {
  try {
    const response = await $fetch('/api/db-status');
    dbStatus.value = response.status;
  } catch (error) {
    dbStatus.value = 'error';
  }
}

async function fetchMinioStatus() {
  try {
    const response = await $fetch('/api/minio-status');
    minioStatus.value = response.status;
  } catch (error) {
    minioStatus.value = 'error';
  }
}

onMounted(() => {
  fetchDbStatus();
  fetchMinioStatus();
});
</script>
