import {queryDatabase} from "~/server/utils/db";

export default defineEventHandler(async (event) => {

    const query  = `SELECT COUNT(*) from photos`
    const count = await queryDatabase(query);
    return {
        status: 200,
        data: count
    }
})