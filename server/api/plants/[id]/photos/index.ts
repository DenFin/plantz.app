import type { H3Event } from 'h3'
import { defineEventHandler } from 'h3'
import { uploadFile } from '../../../../utils/minio'
import formidable from 'formidable'
import { readFile } from 'fs/promises'
import { database } from '../../../../utils/db'

export default defineEventHandler(async (event: H3Event) => {
    // Handle POST request for photo upload
    if (event.method !== 'POST') {
        return { error: 'Method not allowed', status: 405 }
    }

    try {
        const id = event.context.params?.id
        if (!id) {
            return { error: 'Plant ID is required', status: 400 }
        }
        console.log('Processing photo upload for plant:', id)

        const form = formidable({});
        const [fields, files] = await form.parse(event.node.req);

        console.log('Received files:', files)

        if (!files.photo?.[0]) {
            console.error('No photo file found in request')
            return { error: 'No photo provided', status: 400 };
        }

        // Start a database transaction
        const client = await database();
        try {
            await client.query('BEGIN');
            console.log('Started database transaction')

            const file = files.photo[0];
            const fileBuffer = await readFile(file.filepath);
            console.log('Read file buffer, size:', fileBuffer.length)

            // For now, using a placeholder user ID until auth is implemented
            const userId = 'default-user';

            // Upload to Minio with user directory
            const objectKey = await uploadFile(
                fileBuffer,
                file.originalFilename || 'unnamed.jpg',
                file.mimetype || 'image/jpeg',
                userId
            );
            console.log('Uploaded to MinIO, objectKey:', objectKey)

            // Create photo record
            const createPhotoQuery = `
                INSERT INTO photos (plant_id, image_url)
                VALUES ($1, $2)
                RETURNING id;
            `;
            const result = await client.query(createPhotoQuery, [id, objectKey]);
            console.log('Created photo record:', result.rows[0])

            await client.query('COMMIT');
            return { status: 201, data: { id: result.rows[0].id } };

        } catch (error) {
            console.error('Transaction error:', error)
            await client.query('ROLLBACK');
            throw error;
        } finally {
            await client.end();
        }
    } catch (error) {
        console.error('Error uploading photo:', error);
        return { error: 'Failed to upload photo', status: 500 };
    }
}) 