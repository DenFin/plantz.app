// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/image', '@vite-pwa/nuxt', '@vueuse/nuxt', '@nuxt/eslint'],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      openRouterApiKey: process.env.NUXT_PUBLIC_OPEN_ROUTER_API_KEY,
    },
  },
  compatibilityDate: '2024-11-01',
  vite: {
    server: {
      allowedHosts: ['plantz.app.local'],
    },
  },
  eslint: {
    config: {
      stylistic: true,
      standalone: false,
    },
  },
  pwa: {
    client: {
      installPrompt: true,
      // you don't need to include this: only for testing purposes
      // if enabling periodic sync for update use 1 hour or so (periodicSyncForUpdates: 3600)
      periodicSyncForUpdates: 20,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module',
    },
  },
})
