import type { H3Event } from 'h3'
import { defineEventHandler, getRouterParam } from 'h3'
import consola from 'consola'
import { queryDatabase } from '~~/server/utils/db'
import { createMinioClient } from '~~/server/utils/minio'

export default defineEventHandler(async (event: H3Event) => {
  try {
    const plantId = getRouterParam(event, 'id')
    const photoId = getRouterParam(event, 'photoId')
    const apiKey = process.env.NUXT_PUBLIC_OPEN_ROUTER_API_KEY

    if (!plantId || !photoId) {
      return { error: 'Plant ID and Photo ID are required', status: 400 }
    }

    if (!apiKey) {
      consola.error('OpenRouter API key not configured')
      return { error: 'AI analysis not configured', status: 500 }
    }

    // Get photo details from database
    const photoQuery = `
      SELECT image_url 
      FROM photos 
      WHERE id = $1 AND plant_id = $2;
    `
    const photoResult = await queryDatabase(photoQuery, [photoId, plantId])

    if (!photoResult || photoResult.length === 0) {
      return { error: 'Photo not found', status: 404 }
    }

    const imageUrl = photoResult[0].image_url

    // Load image from MinIO
    const minioClient = createMinioClient()
    const bucketName = process.env.MINIO_BUCKET || 'plantz'

    let imageBuffer: Buffer
    try {
      const chunks: Buffer[] = []
      const dataStream = await minioClient.getObject(bucketName, imageUrl)
      
      for await (const chunk of dataStream) {
        chunks.push(chunk)
      }
      imageBuffer = Buffer.concat(chunks)
    }
    catch (error) {
      consola.error('Error loading image from MinIO:', error)
      return { error: 'Failed to load image', status: 500 }
    }

    // Convert to base64
    const base64Image = imageBuffer.toString('base64')
    
    // Determine MIME type from file extension
    const extension = imageUrl.split('.').pop()?.toLowerCase()
    let mimeType = 'image/jpeg'
    if (extension === 'png') {
      mimeType = 'image/png'
    }
    else if (extension === 'gif') {
      mimeType = 'image/gif'
    }
    else if (extension === 'webp') {
      mimeType = 'image/webp'
    }

    const dataUrl = `data:${mimeType};base64,${base64Image}`

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://plantz.app.local',
        'X-Title': 'Plantz',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-4.1-fast:free',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identifiziere die Pflanze auf diesem Bild und bewerte ihren Zustand. Antworte auf Deutsch.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      consola.error('OpenRouter API error:', errorText)
      return { error: 'AI analysis failed', status: openRouterResponse.status }
    }

    const openRouterData = await openRouterResponse.json()
    const aiResponse = openRouterData.choices?.[0]?.message?.content

    if (!aiResponse) {
      consola.error('Invalid response from OpenRouter:', openRouterData)
      return { error: 'Invalid AI response', status: 500 }
    }

    return {
      status: 200,
      data: {
        analysis: aiResponse,
      },
    }
  }
  catch (error) {
    consola.error('Error in AI analysis:', error)
    return { error: 'Failed to analyze photo', status: 500 }
  }
})

