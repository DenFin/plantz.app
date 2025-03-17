import type { H3Event } from 'h3'
import { createRouter, defineEventHandler, useBase, getRouterParam } from 'h3'
import { uploadFile } from '../../utils/minio'
import formidable from 'formidable'
import { readFile } from 'fs/promises'
import { database, queryDatabase } from '../../utils/db'
import { createMinioClient } from '../../utils/minio'
import { log } from 'console'

const router = createRouter()

// Root route first
router.get(
    '/',
    defineEventHandler(async (event: H3Event) => {
        try {
            const query = `
                SELECT
                    p.*,
                    (
                        SELECT json_build_object(
                                       'id', ph.id,
                                       'image_url', ph.image_url
                               )
                        FROM photos ph
                        WHERE ph.plant_id = p.id
                        ORDER BY ph.taken_at DESC
                        LIMIT 1
                    ) as thumbnail
                FROM plants p;
            `;

            const plants = await queryDatabase(query);

            // Create Minio client to generate URLs for thumbnails
            const minioClient = createMinioClient();
            const bucketName = process.env.MINIO_BUCKET || 'plantz';

            // Generate presigned URLs for thumbnails
            for (const plant of plants) {
                if (plant.thumbnail) {
                    plant.thumbnail.url = await minioClient.presignedGetObject(
                        bucketName,
                        plant.thumbnail.image_url,
                        24 * 60 * 60 // URL expires in 24 hours
                    );
                }
            }

            return { status: 200, data: plants };
        } catch (error) {
            console.error('Error handling plants:', error);
            return { error: 'Failed to fetch plants' };
        }
    }),
);

// Get single plant details
router.get(
    '/:id',
    defineEventHandler(async (event: H3Event) => {
        try {
            const id = getRouterParam(event, 'id')
            console.log('Fetching plant details for ID:', id)

            const query = `
                SELECT
                    p.*,
                    CASE
                        WHEN COUNT(ph.id) = 0 THEN '[]'::json
                        ELSE json_agg(ph ORDER BY ph.taken_at DESC)
                        END as photos
                FROM plants p
                         LEFT JOIN (
                    SELECT * FROM photos ORDER BY taken_at DESC
                ) ph ON p.id = ph.plant_id
                WHERE p.id = $1
                GROUP BY p.id;
            `;



            const plants = await queryDatabase(query, [id]);
            console.log('Database response:', plants)

            if (!plants || plants.length === 0) {
                console.log('No plant found with ID:', id)
                return { status: 404, error: 'Plant not found' };
            }

            // Create Minio client to generate URLs
            const minioClient = createMinioClient();
            const bucketName = process.env.MINIO_BUCKET || 'plantz';

            // If there are photos and they're not null, generate presigned URLs
            if (plants[0].photos && plants[0].photos[0] !== null) {
                const photosWithUrls = await Promise.all(plants[0].photos.map(async (photo: any) => {
                    const url = await minioClient.presignedGetObject(
                        bucketName,
                        photo.image_url,
                        24 * 60 * 60 // URL expires in 24 hours
                    );
                    return { ...photo, url };
                }));
                plants[0].photos = photosWithUrls;
            } else {
                plants[0].photos = [];
            }

            console.log('Returning plant with photos:', plants[0].photos.length)
            return { status: 200, data: plants };
        } catch (error) {
            console.error('Error fetching plant:', error);
            return { error: 'Failed to fetch plant', status: 500 };
        }
    }),
);

// Photo-related routes
router.post(
    '/:id/photos',
    defineEventHandler(async (event: H3Event) => {
        try {
            const id = getRouterParam(event, 'id')
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
);

router.delete(
    '/:plantId/photos/:photoId',
    defineEventHandler(async (event: H3Event) => {
        try {
            const plantId = getRouterParam(event, 'plantId')
            const photoId = getRouterParam(event, 'photoId')

            // Start a database transaction
            const client = await database();
            try {
                await client.query('BEGIN');

                // Get the photo details first
                const getPhotoQuery = `
                    SELECT image_url FROM photos 
                    WHERE id = $1 AND plant_id = $2;
                `;
                const photoResult = await client.query(getPhotoQuery, [photoId, plantId]);

                if (photoResult.rows.length === 0) {
                    return { error: 'Photo not found', status: 404 };
                }

                const objectKey = photoResult.rows[0].image_url;

                // Delete from Minio
                const minioClient = createMinioClient();
                const bucketName = process.env.MINIO_BUCKET || 'plantz';

                try {
                    await minioClient.removeObject(bucketName, objectKey);
                } catch (error) {
                    console.error('Error deleting from Minio:', error);
                    // Continue with database deletion even if Minio deletion fails
                }

                // Delete from database
                const deletePhotoQuery = `
                    DELETE FROM photos 
                    WHERE id = $1 AND plant_id = $2;
                `;
                await client.query(deletePhotoQuery, [photoId, plantId]);

                await client.query('COMMIT');
                return { status: 200, message: 'Photo deleted successfully' };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                await client.end();
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            return { error: 'Failed to delete photo', status: 500 };
        }
    })
);

// Create and delete plant routes
router.post(
    '/',
    defineEventHandler(async (event: H3Event) => {
        try {
            console.log('Creating plant')
            const form = formidable({});
            const [fields, files] = await form.parse(event.node.req);

            if (!fields.name?.[0] || !fields.species?.[0] || !fields.location?.[0]) {
                return { error: 'Missing required fields', status: 400 };
            }

            // Start a database transaction
            const client = await database();
            try {
                await client.query('BEGIN');

                // 1. Create the plant
                const createPlantQuery = `
                    INSERT INTO plants (name, species, location)
                    VALUES ($1, $2, $3)
                    RETURNING id;
                `;
                const plantResult = await client.query(createPlantQuery, [
                    fields.name[0],
                    fields.species[0],
                    fields.location[0]
                ]);
                const plantId = plantResult.rows[0].id;

                // 2. Handle photo upload if present
                if (files.photo?.[0]) {
                    const file = files.photo[0];
                    const fileBuffer = await readFile(file.filepath);

                    // For now, using a placeholder user ID until auth is implemented
                    const userId = 'default-user';

                    // Upload to Minio with user directory
                    const objectKey = await uploadFile(
                        fileBuffer,
                        file.originalFilename || 'unnamed.jpg',
                        file.mimetype || 'image/jpeg',
                        userId
                    );

                    // Create photo record
                    const createPhotoQuery = `
                        INSERT INTO photos (plant_id, image_url)
                        VALUES ($1, $2)
                        RETURNING id;
                    `;
                    await client.query(createPhotoQuery, [plantId, objectKey]);
                }

                await client.query('COMMIT');
                return { status: 201, data: { id: plantId } };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                await client.end();
            }
        } catch (error) {
            console.error('Error creating plant:', error);
            return { error: 'Failed to create plant', status: 500 };
        }
    }),
);

router.delete(
    '/:id',
    defineEventHandler(async (event: H3Event) => {
        try {
            const id = getRouterParam(event, 'id')
            const query = `DELETE FROM plants WHERE id = $1`;
            const plants = await queryDatabase(query, [id]);

            return { status: 200, data: plants };
        } catch (error) {
            console.error('Error handling plants:', error);
            return { error: 'Failed to fetch plants' };
        }
    }),
);

export default useBase('/api/plants/', router.handler)
