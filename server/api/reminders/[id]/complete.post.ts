import type { H3Event } from 'h3'
import consola from 'consola'
import { createError, defineEventHandler, getRouterParam } from 'h3'
import { database } from '~~/server/utils/db'

export default defineEventHandler(async (event: H3Event) => {
  const id = getRouterParam(event, 'id')
  const client = await database()

  try {
    await client.query('BEGIN')

    const existing = await client.query(
      'SELECT * FROM reminders WHERE id = $1 FOR UPDATE;',
      [id],
    )
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK')
      throw createError({ statusCode: 404, statusMessage: 'Reminder not found' })
    }
    const reminder = existing.rows[0]
    if (reminder.completed_at) {
      await client.query('ROLLBACK')
      throw createError({ statusCode: 409, statusMessage: 'Reminder is already completed' })
    }

    const completed = await client.query(
      'UPDATE reminders SET completed_at = now() WHERE id = $1 RETURNING *;',
      [id],
    )

    // Recurrence counts from the completion, not from the due date. Counting from the
    // due date would produce a pile of missed occurrences after a few unused weeks.
    let successor = null
    if (reminder.recurrence_days) {
      const inserted = await client.query(
        // make_interval keeps $2 an integer. Concatenating it into a string would bind
        // the parameter as text and the recurrence_days column would then reject it.
        `INSERT INTO reminders (plant_id, remind_at, message, recurrence_days)
         VALUES ($1, now() + make_interval(days => $2::int), $3, $2::int)
         RETURNING *;`,
        [reminder.plant_id, reminder.recurrence_days, reminder.message],
      )
      successor = inserted.rows[0]
    }

    await client.query('COMMIT')
    consola.info(`Completed reminder ${id}${successor ? `, next on ${successor.remind_at}` : ''}`)
    return { status: 200, data: { completed: completed.rows[0], successor } }
  }
  catch (error) {
    // createError values already rolled back above; anything else lands here.
    if ((error as any)?.statusCode)
      throw error
    await client.query('ROLLBACK')
    throw error
  }
  finally {
    client.release()
  }
})
