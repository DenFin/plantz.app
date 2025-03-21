

export const useNotes = () => {

    const many = useState('many', () => null)
    const recent = useState('recent', () => null)

    async function fetchMany() {
        try {
            const response = await $fetch('/api/notes');
            console.log('response.data.length',response.data.length)
            many.value = response.data;
            return response
        } catch(e) {
            console.error(e)
        }
    }

    async function fetchRecent() {
        try {
            const response = await $fetch('/api/notes/recent');
            console.log('response.data.length',response.data.length)
            recent.value = response.data;
            return response
        } catch(e) {
            console.error(e)
        }
    }

    return {
        many,
        recent,
        fetchMany,
        fetchRecent
    }

}