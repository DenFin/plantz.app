import pg from 'pg'

export async function database() {
    const {Client} = pg;

    // Destructure environment variables
    const {DATABASE_PORT, DATABASE_USER, DATABASE_HOST, DATABASE_NAME, DATABASE_PASSWORD } = process.env;

// Log the values for debugging (be careful not to log sensitive information in production)
    console.log('Database Host:', DATABASE_HOST);
    console.log('Database Port:', DATABASE_PORT);
    console.log('Database User:', DATABASE_USER);
    console.log('Database Password:', DATABASE_PASSWORD ? '******' : 'Not provided');
    console.log('Database Name:', DATABASE_NAME);
    console.log('=========');

    const client = new Client({
        user: process.env.DATABASE_USER,
        host: process.env.DATABASE_HOST,
        database: process.env.DATABASE_NAME,
        password: process.env.DATABASE_PASSWORD,
        port: Number(process.env.DATABASE_PORT),
    });

    // console.log(`Database connected to database`, client);
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