export const useRooms = () => {
  const many: Ref<Array<Room> | null> = useState('rooms', () => null)
  const count: Ref<number | null> = useState('count', () => null)

  async function fetchMany() {
    try {
      const response = await $fetch<ApiResponse<Room[]>>('/api/rooms')
      count.value = response.data.length
      many.value = response.data
      return response
    }
    catch (e) {
      console.error(e)
    }
  }

  function getRoomById(roomId: string) {
    if (many.value && many.value?.length > 0) {
      return many.value.find(room => room.id === roomId)
    }
  }

  return {
    many,
    count,
    fetchMany,
    getRoomById,
  }
}
