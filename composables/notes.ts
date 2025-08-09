export const useNotes = () => {
  const many: Ref<Note[] | null> = useState('many', () => null)
  const recent: Ref<Note[] | null> = useState('recent', () => null)

  async function fetchMany() {
    try {
      const response: ApiResponse<Note[]> = await $fetch<ApiResponse<Note[]>>('/api/notes')
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
      const response: ApiResponse<Note[]> = await $fetch<ApiResponse<Note[]>>('/api/notes/recent')
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
