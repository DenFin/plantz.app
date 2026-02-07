import { authClient } from '~~/lib/auth-client'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data: session } = await authClient.useSession(useFetch)
  const allowedPaths = ['/', '/register', '/login']
  if (!session.value) {
    if (!allowedPaths.includes(to.path)) {
      return navigateTo('/')
    }
  }
})
