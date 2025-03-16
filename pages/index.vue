<template>
  <div>
    <h1>Database Connection Status</h1>
    <p v-if="status === 'connected'">✔ Database is connected successfully!</p>
    <p v-if="status === 'error'">❌ Database connection failed.</p>
    <div>
      <h1>Users</h1>
      <ul>
        <li v-for="user in users" :key="user.id">
          {{ user.name }} ({{ user.email }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const status = ref('');

const fetchDbStatus = async () => {
  try {
    const response = await $fetch('/api/db-status');
    status.value = response.status;
  } catch (error) {
    status.value = 'error';
  }
};

const users = ref([]);

const fetchUsers = async () => {
  try {
    const response = await $fetch('/api/users');
    users.value = response.users;
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

onMounted(() => {
  fetchDbStatus();
  fetchUsers();
});
</script>
