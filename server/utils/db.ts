import pg from 'pg'

export async function database() {
    const {Client} = pg;

    const client = new Client({
        user: process.env.DATABASE_USER,
        host: process.env.DATABASE_HOST,
        database: process.env.DATABASE_NAME,
        password: process.env.DATABASE_PASSWORD,
        port: Number(process.env.DATABASE_PORT),
    });
    await client.connect();
    return client;
}

export async function queryDatabase(query: string, params: any[] = []) {
    const client = await database();
    try {
        const res = await client.query(query, params);
        return res.rows; // Return the rows of the result
    } catch (err) {
        console.error("Database query error:", err);
        throw err; // Rethrow the error to be handled by the caller
    } finally {
        await client.end(); // Make sure to close the connection
    }
}