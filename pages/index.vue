<template>
  <section>
    <div class="flex gap-1 items-center mb-4">
      <Icon name="heroicons-solid:home" />
      <p class="font-bold">Dashboard</p>
    </div>

    <div class="grid gap-4">
      <BaseCard>
        <BaseHeadline element="h2" text="System Status" class="mb-4" />
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <Icon v-if="status === 'connected'" name="heroicons:check-circle" class="w-6 h-6 text-emerald-500" />
            <Icon v-if="status === 'error'" name="heroicons:x-circle" class="w-6 h-6 text-red-500" />
            <span class="font-medium">Database Connection</span>
            <UBadge v-if="status === 'connected'" color="success" variant="subtle">Connected</UBadge>
            <UBadge v-if="status === 'error'" color="danger" variant="subtle">Error</UBadge>
          </div>
          <!-- Placeholder for future Minio status -->
          <div class="flex items-center gap-2 opacity-50">
            <Icon name="heroicons:clock" class="w-6 h-6" />
            <span class="font-medium">Minio Connection</span>
            <UBadge variant="subtle">Coming soon</UBadge>
          </div>
        </div>
      </BaseCard>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const status = ref('');

async function fetchDbStatus() {
  try {
    const response = await $fetch('/api/db-status');
    status.value = response.status;
  } catch (error) {
    status.value = 'error';
  }
}

onMounted(() => {
  fetchDbStatus();
});
</script>
