import {defineEventHandler} from "h3";

export default defineEventHandler(async (event) => {
    console.log('Creating note');
    const body = await readBody(event);
    const { plant_id, note } = body;

    if(!plant_id || !note) {
        return { status: 400 }
    }

    try {
        const client = await database();
        await client.query('BEGIN');

        const insertNoteQuery = `
                    INSERT INTO notes (plant_id, content)
                    VALUES ($1, $2)
                    RETURNING id;
                `;

        const insertedNote = await client.query(insertNoteQuery, [plant_id, note]);
        await client.query('COMMIT');
        return { status: 201, data: insertedNote}
    } catch(error) {
        console.error(error);
        return { status: 400 }
    }
})