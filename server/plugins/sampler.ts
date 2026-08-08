import { SAMPLE_INTERVAL_MS, tick } from '~~/server/utils/sampler'

export default defineNitroPlugin(() => {
  // A nitro plugin runs once per process. A route handler or middleware would run per
  // request and create one interval per request (Q-I3).
  void tick()
  const timer = setInterval(() => void tick(), SAMPLE_INTERVAL_MS)
  timer.unref?.()
})
