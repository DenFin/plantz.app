export const useRooms = () => {

    const many: Ref<Array<Room> | null> = useState('many', () => null)
    const count = useState('count', () => null)

    async function fetchMany() {
        try {
            const response = await $fetch('/api/rooms', { lazy: true });
            console.log('response.data.length',response.data.length)
            count.value = response.data.length
            many.value = response.data;
            return response
        } catch(e) {
            console.error(e)
        }
    }

    function getRoomById(roomId: string) {
        if(many.value?.length > 0) {
            return many.value.find(room => room.id === roomId)
        }
    }

    return {
        many,
        count,
        fetchMany,
        getRoomById
    }

}