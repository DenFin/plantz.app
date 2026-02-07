<template>
  <div class="max-w-sm mx-auto mt-8 space-y-6">
    <BaseHeadline
      element="h1"
      text="Registrieren"
    />
    <form
      class="space-y-4"
      @submit.prevent="handleSignUp"
    >
      <div>
        <BaseLabel
          for="register-name"
          text="Name"
        />
        <UInput
          id="register-name"
          v-model="name"
          type="text"
          placeholder="Dein Name"
          required
          class="mt-1 w-full"
          autocomplete="name"
        />
      </div>
      <div>
        <BaseLabel
          for="register-email"
          text="E-Mail"
        />
        <UInput
          id="register-email"
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
          for="register-password"
          text="Passwort (min. 8 Zeichen)"
        />
        <UInput
          id="register-password"
          v-model="password"
          type="password"
          placeholder="••••••••"
          required
          minlength="8"
          class="mt-1 w-full"
          autocomplete="new-password"
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
        Registrieren
      </UButton>
    </form>
    <p class="text-sm text-center text-slate-600">
      Bereits ein Konto?
      <NuxtLink
        to="/login"
        class="font-semibold text-emerald-700 hover:underline"
      >
        Anmelden
      </NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  title: 'Registrieren',
})

const authClient = useAuthClient()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSignUp() {
  error.value = ''
  loading.value = true
  try {
    const result = await authClient.signUp.email({
      name: name.value,
      email: email.value,
      password: password.value,
    })
    if (result.error) {
      error.value = result.error.message ?? 'Registrierung fehlgeschlagen.'
      return
    }
    await navigateTo('/')
  }
  finally {
    loading.value = false
  }
}
</script>
