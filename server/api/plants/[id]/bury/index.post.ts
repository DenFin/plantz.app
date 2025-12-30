import consola from 'consola'
export default defineEventHandler(async (event) => {
    try {
        consola.info('Burying plant')
        const id = getRouterParam(event, 'id')
        const query = `
        UPDATE plants
        SET status = $2
        WHERE id = $1
        `;
        const values = [id, "dead"]; 
        const plants = await queryDatabase(query, values)

        return { status: 200, data: plants }
    } catch (error) {
        consola.error('Error burying plant:', error)
        return { error: 'Failed to bury plants' }
    }
})