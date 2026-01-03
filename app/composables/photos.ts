import { Logger } from '~/utils/logger'

export function usePhotos() {
  const many: Ref<Photo[] | null> = useState('many', () => null)
  const recent: Ref<Photo[] | null> = useState('recentPhotos', () => null)

  async function fetchMany() {
    try {
      const logger = new Logger()
      logger.info('GET', 'photos')
      const response = await $fetch<ApiResponse<Photo[]>>('/api/photos')
      logger.success('GET', 'photos', response)
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
      logger.info('GET', 'photos')
      const response = await $fetch<ApiResponse<Photo[]>>('/api/photos/recent')
      logger.success('GET', 'photos', response)
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
