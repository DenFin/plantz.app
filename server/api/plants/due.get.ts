import type { H3Event } from 'h3'
import { defineEventHandler, getQuery } from 'h3'
import { overduePlants } from '~~/server/utils/wateringDue'

export default defineEventHandler(async (event: H3Event) => {
  const { limit } = getQuery(event)
  const parsed = Number(limit)
  const rows = await overduePlants(Number.isInteger(parsed) && parsed > 0 ? parsed : undefined)

  return { status: 200, data: rows }
})
