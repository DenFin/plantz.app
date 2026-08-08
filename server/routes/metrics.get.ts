import { defineEventHandler, setHeader } from 'h3'
import { pool } from '~~/server/utils/db'
import { dbPoolConnections, registry } from '~~/server/utils/metrics'

export default defineEventHandler(async (event) => {
  // Pool state is read straight off the pool object, which is free. Everything else in
  // the registry was written by the sampler; this handler touches no database.
  dbPoolConnections.set({ state: 'idle' }, pool.idleCount)
  dbPoolConnections.set({ state: 'active' }, pool.totalCount - pool.idleCount)
  dbPoolConnections.set({ state: 'waiting' }, pool.waitingCount)

  setHeader(event, 'content-type', registry.contentType)
  return registry.metrics()
})
