import { defineEventHandler } from 'h3'
import { checkMinioConnection } from '../utils/minio'

export default defineEventHandler(async (event) => {
  try {
    const isConnected = await checkMinioConnection()
    return {
      status: isConnected ? 'connected' : 'error',
      message: isConnected ? 'Minio is connected successfully.' : 'Failed to connect to Minio.',
    }
  }
  catch (error) {
    console.error('Minio status check error:', error)
    return {
      status: 'error',
      message: 'Failed to check Minio connection status.',
    }
  }
})
