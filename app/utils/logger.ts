type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type AppResource = 'notes' | 'photos'

export const HTTP_EMOJI: Record<string, string> = {
  GET: '🔍',
  POST: '➕',
  PUT: '♻️',
  PATCH: '🩹',
  DELETE: '❌',
  OPTIONS: '⚙️',
  HEAD: '👀',
}

export class Logger {
  constructMessage(method: HttpMethod, resource: AppResource) {
    const emoji = HTTP_EMOJI[method]
    const message = `${emoji} – Fetching ${resource}`
    return message
  }

  info(method: HttpMethod, resource: AppResource) {
    // eslint-disable-next-line no-console
    console.info(this.constructMessage(method, resource))
  }

  success(method: HttpMethod, resource: AppResource, response: any) {
    // eslint-disable-next-line no-console
    console.info(`✅ – Successfully fetched ${response.data.length} ${resource}`)
  }
}
