import {defineEventHandler, H3Event} from "h3";
import {queryDatabase} from "~/server/utils/db";

export default defineEventHandler(async () => {
    try {
        const query = 'SELECT * FROM notes'
        const plants = await queryDatabase(query);

        return {
            status: 200,
            data: plants
        }
    } catch(error) {
        console.error(error);
        return { status: 400 }
    }

})