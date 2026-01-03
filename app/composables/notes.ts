import { Logger } from '~/utils/logger'

export function useNotes() {
  const many: Ref<Note[] | null> = useState('many', () => null)
  const recent: Ref<Note[] | null> = useState('recent', () => null)

  async function fetchMany() {
    try {
      const logger = new Logger()
      logger.info('GET', 'notes')
      const response: ApiResponse<Note[]> = await $fetch<ApiResponse<Note[]>>('/api/notes')
      logger.success('GET', 'notes', response)
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  async function fetchRecent() {
    try {
      const logger = new Logger()
      logger.info('GET', 'notes')
      const response: ApiResponse<Note[]> = await $fetch<ApiResponse<Note[]>>('/api/notes/recent')
      logger.success('GET', 'notes', response)
      recent.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  return {
    many,
    recent,
    fetchMany,
    fetchRecent,
  }
}
