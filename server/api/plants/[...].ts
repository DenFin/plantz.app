import type {H3Event} from 'h3'
import {createRouter, defineEventHandler, useBase} from 'h3'

const router = createRouter()

router.get(
    '/',
    defineEventHandler(async (event: H3Event) => {
        try {
            const query = `SELECT * FROM plants;`;
            const plants = await queryDatabase(query );

            return { status: 200 , data: plants };
        } catch (error) {
            console.error('Error handling plants:', error);
            return {error: 'Failed to fetch plants'};
        }
    }),
)

router.get(
    '/:id',
    defineEventHandler(async (event: H3Event) => {
        try {
            const id = getRouterParam(event, 'id')
            console.log('id', id)
            const query = `SELECT * FROM plants WHERE id = $1`;
            const plants = await queryDatabase(query, [id] );

            return { status: 200 , data: plants };
        } catch (error) {
            console.error('Error handling plants:', error);
            return {error: 'Failed to fetch plants'};
        }
    }),
)

router.post(
    '/',
    defineEventHandler(async (event: H3Event) => {
        console.log('IN ROUTE')
        try {
            // 1. Create a plant (Example with hardcoded data, you can modify to accept input from the event)
            const {name, species, location} = await readBody(event)
            const body = await readBody(event)
            console.log('body', body)
            console.log('name', name)
            const createPlantQuery = `
                INSERT INTO plants (name, species, location)
                VALUES ($1, $2, $3) RETURNING *;
            `;
            const createdPlant = await queryDatabase(createPlantQuery, [name, species, location]);

            return { status: 201 , data: createdPlant };
        } catch (error) {
            console.error('Error handling plants:', error);
            return {error: 'Failed to create or fetch plants'};
        }
    }),
)

router.delete(
    '/:id',
    defineEventHandler(async (event: H3Event) => {
        try {
            const id = getRouterParam(event, 'id')
            console.log('id', id)
            const query = `DELETE FROM plants WHERE id = $1`;
            const plants = await queryDatabase(query, [id] );

            return { status: 200 , data: plants };
        } catch (error) {
            console.error('Error handling plants:', error);
            return {error: 'Failed to fetch plants'};
        }
    }),
)

export default useBase('/api/plants/', router.handler)
