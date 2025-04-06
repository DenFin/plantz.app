import { readFile } from 'fs/promises'
import { defineEventHandler } from 'h3'
import formidable from 'formidable'
import consola from 'consola'
import { uploadFile } from '~/server/utils/minio'

export default defineEventHandler(async (event) => {
  console.info('Creating note')
  const form = formidable({})
  const [fields, files] = await form.parse(event.node.req)
  const { plant_id, note } = fields
  if (!plant_id || !note) {
    consola.error('plant_id is required')
    return { status: 400 }
  }
  try {
    const client = await database()
    await client.query('BEGIN')
    console.log('plant_id', plant_id)
    console.log('note', note)
    const insertNoteQuery = `
                    INSERT INTO notes (plant_id, content)
                    VALUES ($1, $2)
                    RETURNING id;
                `
    const insertedNote = await client.query(insertNoteQuery, [plant_id[0], note[0]])
    const note_id = insertedNote.rows[0].id
    console.info('Inserted note: ', note_id)

    if (files.photo?.[0]) {
      console.info('Note has a photo!')
      const file = files.photo[0]
      const fileBuffer = await readFile(file.filepath)

      // For now, using a placeholder user ID until auth is implemented
      const userId = 'default-user'

      // Upload to Minio with user directory
      const objectKey = await uploadFile(
        fileBuffer,
        file.originalFilename || 'unnamed.jpg',
        file.mimetype || 'image/jpeg',
        userId,
      )
      console.info('Uploaded photo: ' + objectKey)

      // Create photo record
      const createPhotoQuery = `
                        INSERT INTO photos (plant_id, image_url, note_id)
                        VALUES ($1, $2, $3)
                        RETURNING id;
                    `
      await client.query(createPhotoQuery, [plant_id[0], objectKey, note_id])
    }

    await client.query('COMMIT')
    return { status: 201, data: insertedNote }
  }
  catch (error) {
    console.error(error)
    return { status: 400 }
  }
})
