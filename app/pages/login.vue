<template>
  <div class="max-w-sm mx-auto mt-8 space-y-6">
    <BaseHeadline
      element="h1"
      text="Anmelden"
    />
    <form
      class="space-y-4"
      @submit.prevent="handleSignIn"
    >
      <div>
        <BaseLabel
          for="login-email"
          text="E-Mail"
        />
        <UInput
          id="login-email"
          v-model="email"
          type="email"
          placeholder="deine@email.de"
          required
          class="mt-1 w-full"
          autocomplete="email"
        />
      </div>
      <div>
        <BaseLabel
          for="login-password"
          text="Passwort"
        />
        <UInput
          id="login-password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
          class="mt-1 w-full"
          autocomplete="current-password"
        />
      </div>
      <p
        v-if="error"
        class="text-sm text-red-600"
      >
        {{ error }}
      </p>
      <UButton
        type="submit"
        block
        :loading="loading"
      >
        Anmelden
      </UButton>
    </form>
    <p class="text-sm text-center text-slate-600">
      Noch kein Konto?
      <NuxtLink
        to="/register"
        class="font-semibold text-emerald-700 hover:underline"
      >
        Registrieren
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Anmelden',
})

const authClient = useAuthClient()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSignIn() {
  error.value = ''
  loading.value = true
  try {
    const result = await authClient.signIn.email({
      email: email.value,
      password: password.value,
    })
    if (result.error) {
      error.value = result.error.message ?? 'Anmeldung fehlgeschlagen.'
      return
    }
    await navigateTo('/')
  }
  finally {
    loading.value = false
  }
}
</script>
