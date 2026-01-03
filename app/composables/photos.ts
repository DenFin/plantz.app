export function usePhotos() {
  const many: Ref<Photo[] | null> = useState('many', () => null)
  const recent: Ref<Photo[] | null> = useState('recentPhotos', () => null)

  async function fetchMany() {
    try {
      const response = await $fetch<ApiResponse<Photo[]>>('/api/photos')
      console.log('response.data.length', response.data.length)
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  async function fetchRecent() {
    try {
      const response = await $fetch<ApiResponse<Photo[]>>('/api/photos/recent')
      console.log('response.data.length', response.data.length)
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
