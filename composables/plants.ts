export const usePlants = () => {

    const many = useState('many', () => null)

    async function fetchMany() {
        try {
            const response = await $fetch('/api/plants');
            many.value = response.data;
            return response
        } catch(e) {
            console.error(e)
        }
    }

    return {
        many,
        fetchMany,
    }

}