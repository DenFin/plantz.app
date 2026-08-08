import consola from 'consola'
import { createError } from 'h3'
import { changePlantStatus, isPlantStatus } from '~~/server/utils/plantStatus'

/**
 * Columns this endpoint may write. `status` is deliberately absent: it goes through
 * `changePlantStatus` so the history event cannot be skipped.
 */
const UPDATABLE_COLUMNS = [
  'name',
  'species',
  'location',
  'room_id',
  'parent_plant_id',
  'watering_interval_days',
] as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const plantId = body?.id ?? getRouterParam(event, 'id')

  if (body?.status !== undefined && !isPlantStatus(body.status)) {
    throw createError({ statusCode: 400, statusMessage: 'status is not a known plant status' })
  }

  // Only columns the body actually carries are written. The previous version listed every
  // column unconditionally, so a partial body such as {"watering_interval_days":7} wrote
  // NULL over the name and the statement died on the NOT NULL constraint. A key that is
  // present and null still clears the column, which is how an interval gets removed.
  //
  // This also settles Q-CARE3-2: parameters are built in order, so the old $5 gap cannot
  // reappear.
  const columns = UPDATABLE_COLUMNS.filter(column => body?.[column] !== undefined)
  const values: any[] = [plantId]
  const assignments = columns.map((column) => {
    values.push(body[column])
    return `${column} = $${values.length}`
  })

  const client = await database()
  try {
    await client.query('BEGIN')

    if (assignments.length > 0) {
      await client.query(
        `UPDATE plants SET ${assignments.join(', ')} WHERE id = $1`,
        values,
      )
    }

    if (body?.status !== undefined) {
      const changeEvent = await changePlantStatus(plantId, body.status, { client })
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
