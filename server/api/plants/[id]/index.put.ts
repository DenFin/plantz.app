import consola from 'consola'
import { createError } from 'h3'
import { changePlantStatus, isPlantStatus } from '~~/server/utils/plantStatus'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id: plantId, name, species, location, room_id, parent_plant_id, status } = body

  if (status !== undefined && !isPlantStatus(status)) {
    throw createError({ statusCode: 400, statusMessage: 'status is not a known plant status' })
  }

  // Q-CARE3-2: the old statement bound $1..$4 and $6 while matching on $5, leaving a gap
  // nobody could explain. Rewritten with contiguous parameters instead of reconstructing
  // what $5 once was.
  const query = `
        UPDATE plants
        SET name = $2, species = $3, location = $4, room_id = $5, parent_plant_id = $6
        WHERE id = $1
    `
  const values = [plantId, name, species, location, room_id, parent_plant_id]
  const client = await database()
  try {
    await client.query('BEGIN')
    await client.query(query, values)

    // Status goes through the helper, never through the statement above, so the history
    // event cannot be forgotten. A no-op change records nothing.
    if (status !== undefined) {
      const changeEvent = await changePlantStatus(plantId, status, { client })
      if (changeEvent)
        consola.info(`Plant ${plantId}: ${changeEvent.from_status} to ${changeEvent.to_status}`)
    }

    await client.query('COMMIT')
    return { status: 204 }
  }
  catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    return { status: 404 }
  }
  finally {
    client.release()
  }
})
