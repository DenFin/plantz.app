import type { H3Event } from 'h3'
import { defineEventHandler, getRequestURL } from 'h3'
import { httpRequestDuration, httpRequests } from '~~/server/utils/metrics'

/**
 * Turns a request into the route pattern it matched, e.g. `/plants/[id]`, never the raw
 * path. Getting this wrong is silent: the endpoint keeps working, the board keeps
 * working, and Prometheus quietly grows one series per plant forever (AE5).
 *
 * Nitro fills `event.context.matchedRoute` for API routes. Pages do not go through the
 * router the same way, so their path is normalised by replacing any UUID or numeric
 * segment with a placeholder.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC = /^\d+$/

export function routePattern(event: H3Event): string {
  const matched = (event.context as any)?.matchedRoute?.path

  // API routes match a real pattern such as `/api/plants/:id`. Pages all match nitro's
  // catch-all `/**`, which would collapse every page into one series, so those fall
  // through to the path normaliser below and come out as `/plants/[id]`.
  if (typeof matched === 'string' && matched.length > 0 && !matched.includes('*'))
    return matched

  const path = getRequestURL(event).pathname
  const normalised = path
    .split('/')
    .map(segment => (UUID.test(segment) || NUMERIC.test(segment) ? '[id]' : segment))
    .join('/')

  return normalised === '' ? '/' : normalised
}

export default defineEventHandler((event) => {
  // The scrape itself is not interesting and would add a series that only Prometheus
  // causes.
  if (getRequestURL(event).pathname === '/metrics')
    return

  const done = httpRequestDuration.startTimer()

  event.node.res.once('finish', () => {
    const route = routePattern(event)
    done({ route })
    httpRequests.inc({
      route,
      method: event.method,
      status: String(event.node.res.statusCode),
    })
  })
})
