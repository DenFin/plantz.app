import { defineVitestConfig } from '@nuxt/test-utils/config'

// `defineVitestConfig` wires up the Nuxt aliases and auto-imports, so `~/`, `#imports`
// and composables like `computed` resolve inside tests the same way they do in the app.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
  },
})
