import { defineEventHandler } from 'h3'
import { minioUp } from '../utils/metrics'
import { checkMinioConnection } from '../utils/minio'

export default defineEventHandler(async () => {
  try {
    const isConnected = await checkMinioConnection()
    minioUp.set(isConnected ? 1 : 0)
    return {
      status: isConnected ? 'connected' : 'error',
      message: isConnected ? 'Minio is connected successfully.' : 'Failed to connect to Minio.',
    }
  }
  catch (error) {
    minioUp.set(0)
    console.error('Minio status check error:', error)
    return {
      status: 'error',
      message: 'Failed to check Minio connection status.',
    }
  }
})
