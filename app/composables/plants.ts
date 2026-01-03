export function usePlants() {
  const many: Ref<Plant[] | null> = useState('many', () => null)

  async function fetchMany() {
    try {
      const response = await $fetch<ApiResponse<Plant[]>>('/api/plants')
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  function getPlantById(id: string) {
    return many.value?.find(elem => elem.id === id)
  }

  return {
    many,
    fetchMany,
    getPlantById,
  }
}
