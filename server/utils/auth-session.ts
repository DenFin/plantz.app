import type { H3Event } from 'h3'
import { createError } from 'h3'
import { auth } from '~~/lib/auth'
import { fromNodeHeaders } from 'better-auth/node'

/**
 * Liest die aktuelle Session aus dem Request und gibt die User-Id zurück.
 * Wirft 401, wenn keine gültige Session vorhanden ist.
 */
export async function requireUserId(event: H3Event): Promise<string> {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(event.node.req.headers),
  })
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session.user.id
}
