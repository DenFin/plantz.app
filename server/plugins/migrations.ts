import process from 'node:process'
import consola from 'consola'
import { runMigrations } from '~~/server/utils/migrate'

export default defineNitroPlugin((nitroApp) => {
  const ready = runMigrations().catch((error) => {
    consola.error(error instanceof Error ? error.message : String(error))
    // Do not catch and continue: an app serving traffic on a half-migrated schema is
    // worse than an app that will not start (D-D1 in EPIC-PLANTZ-DELIVERY).
    process.exit(1)
  })

  // Nitro starts plugins without awaiting them, so the first request could otherwise
  // arrive while migrations are still running. Gate every request on the same promise.
  nitroApp.hooks.hook('request', async () => {
    await ready
  })
})
