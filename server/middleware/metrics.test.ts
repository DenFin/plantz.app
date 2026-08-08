// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRequestURL: (event: any) => new URL(event.__url, 'http://localhost:3000'),
  }
})

const { routePattern } = await import('./metrics')

function event(url: string, matched?: string) {
  return { __url: url, context: matched ? { matchedRoute: { path: matched } } : {} } as any
}

const UUID = 'b1e7c0de-1234-4abc-9def-0123456789ab'

describe('route label', () => {
  it('uses the matched pattern for api routes', () => {
    expect(routePattern(event(`/api/plants/${UUID}/care`, '/api/plants/:id/care')))
      .toBe('/api/plants/:id/care')
  })

  it('does not use nitro catch-all, which would collapse every page into one series', () => {
    expect(routePattern(event(`/plants/${UUID}`, '/**'))).toBe('/plants/[id]')
  })

  it('replaces a uuid segment, so prometheus never sees a plant id', () => {
    const label = routePattern(event(`/plants/${UUID}`))
    expect(label).toBe('/plants/[id]')
    expect(label).not.toContain(UUID)
  })

  it('replaces a numeric segment too, for rooms', () => {
    expect(routePattern(event('/rooms/42'))).toBe('/rooms/[id]')
  })

  it('leaves a static path alone', () => {
    expect(routePattern(event('/plants'))).toBe('/plants')
  })

  it('collapses three different plant pages onto one label', () => {
    const labels = new Set([
      routePattern(event('/plants/b1e7c0de-1234-4abc-9def-0123456789ab')),
      routePattern(event('/plants/c2f8d1ef-2345-4bcd-8eab-1234567890bc')),
      routePattern(event('/plants/d3a9e2f0-3456-4cde-9fbc-234567890abc')),
    ])
    expect([...labels]).toEqual(['/plants/[id]'])
  })

  it('keeps the root path as a slash', () => {
    expect(routePattern(event('/'))).toBe('/')
  })
})
