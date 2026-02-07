import { toNodeHandler } from 'better-auth/node'
import { auth } from '../../../lib/auth'

export default defineEventHandler((event) => {
  return toNodeHandler(auth)(event.node.req, event.node.res)
})
