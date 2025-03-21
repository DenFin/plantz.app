

export const useNotes = () => {

    const many = useState('many', () => null)

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

    return {
        many,
        fetchMany
    }

}