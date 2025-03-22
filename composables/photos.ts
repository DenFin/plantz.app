

export const usePhotos = () => {

    const many = useState('many', () => null)
    const recent = useState('recentPhotos', () => null)

    async function fetchMany() {
        try {
            const response = await $fetch('/api/photos', { lazy: true } );
            console.log('response.data.length',response.data.length)
            many.value = response.data;
            return response
        } catch(e) {
            console.error(e)
        }
    }

    async function fetchRecent() {
        try {
            const response = await $fetch('/api/photos/recent', { lazy: true });
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