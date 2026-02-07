import { auth } from '../../../lib/auth'
import { toNodeHandler } from 'better-auth/node'

export default defineEventHandler((event) => {
  return toNodeHandler(auth)(event.node.req, event.node.res)
})
