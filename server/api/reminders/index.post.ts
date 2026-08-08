import type { H3Event } from 'h3'
import consola from 'consola'
import { createError, defineEventHandler, readBody } from 'h3'
import { queryDatabase } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody(event)

  // Q-CARE2-1: a reminder always belongs to a plant. A standalone todo list is a
  // different application.
  if (!body?.plant_id) {
    throw createError({ statusCode: 400, statusMessage: 'plant_id is required' })
  }
  if (!body?.remind_at) {
    throw createError({ statusCode: 400, statusMessage: 'remind_at is required' })
  }
  if (body.recurrence_days !== undefined && body.recurrence_days !== null) {
    const days = Number(body.recurrence_days)
    if (!Number.isInteger(days) || days < 1) {
      throw createError({ statusCode: 400, statusMessage: 'recurrence_days must be a positive integer' })
    }
  }

  const plants = await queryDatabase('SELECT id FROM plants WHERE id = $1;', [body.plant_id])
  if (plants.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Plant not found' })
  }

  const rows = await queryDatabase(
    `INSERT INTO reminders (plant_id, remind_at, message, recurrence_days)
     VALUES ($1, $2::timestamp, $3, $4)
     RETURNING *;`,
    [body.plant_id, body.remind_at, body.message ?? null, body.recurrence_days ?? null],
  )

  consola.info(`Created reminder ${rows[0].id} for plant ${body.plant_id}`)
  return { status: 201, data: rows[0] }
})
