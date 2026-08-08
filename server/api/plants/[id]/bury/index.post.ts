import consola from 'consola'
import { changePlantStatus } from '~~/server/utils/plantStatus'

export default defineEventHandler(async (event) => {
  try {
    consola.info('Burying plant')
    const id = getRouterParam(event, 'id')

    // Goes through the same helper as the PUT endpoint, so burying leaves a history
    // event exactly like any other transition.
    const changeEvent = await changePlantStatus(id as string, 'dead')

    return { status: 200, data: changeEvent }
  }
  catch (error) {
    consola.error('Error burying plant:', error)
    return { error: 'Failed to bury plants' }
  }
})
