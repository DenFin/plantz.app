import type { H3Event } from 'h3'
import consola from 'consola'
import { createError, defineEventHandler, getRouterParam, readBody } from 'h3'
import { CARE_TYPES, isCareType } from '~~/server/utils/care'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  const plantId = getRouterParam(event, 'id')
  const body = await readBody(event)

  // Postgres would reject an unknown enum value too, but as a 500 with a driver error
  // string. A 400 that names the allowed values is the more useful answer.
  if (!isCareType(body?.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: `type must be one of: ${CARE_TYPES.join(', ')}`,
    })
  }

  const plants = await queryDatabase('SELECT id FROM plants WHERE id = $1;', [plantId])
  if (plants.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Plant not found' })
  }

  const rows = await queryDatabase(
    `INSERT INTO care_events (plant_id, type, occurred_at, note)
     VALUES ($1, $2, COALESCE($3::timestamp, now()), $4)
     RETURNING *;`,
    [plantId, body.type, body.occurred_at ?? null, body.note ?? null],
  )

  consola.info(`Logged ${body.type} for plant ${plantId}`)
  return { status: 201, data: rows[0] }
})
