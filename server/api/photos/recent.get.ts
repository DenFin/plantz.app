import {defineEventHandler, H3Event} from "h3";
import {queryDatabase} from "~/server/utils/db";
import {createMinioClient} from "~/server/utils/minio";

export default defineEventHandler(async () => {
    try {
        const query = `
            SELECT * FROM photos 
            WHERE taken_at >= (CURRENT_TIMESTAMP - INTERVAL \'1 days\')
            ORDER BY taken_at DESC`

        const plants = await queryDatabase(query);
        const minioClient = createMinioClient();
        const bucketName = process.env.MINIO_BUCKET || 'plantz';
        for (const plant of plants) {
            if (plant.image_url) {
                plant.image_url = await minioClient.presignedGetObject(
                    bucketName,
                    plant.image_url,
                    24 * 60 * 60 // URL expires in 24 hours
                );
            }
        }

        return {
            status: 200,
            data: plants
        }
    } catch(error) {
        console.error(error);
        return { status: 400 }
    }

})