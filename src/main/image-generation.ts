/**
 * Google Gemini image generation wrapper.
 * Uses generateContent with responseModalities: ['IMAGE'] — works with any
 * standard Gemini API key from AI Studio, no special Imagen access required.
 *
 * Model: gemini-2.0-flash-preview-image-generation
 * All API calls happen in the main process — the API key never reaches the renderer.
 */
import { GoogleGenAI, ApiError } from '@google/genai'
import { homedir } from 'os'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const AVATARS_DIR = join(homedir(), '.agents-room', 'avatars')

const IMAGE_MODEL = 'gemini-3.1-flash-image-preview'

export type ImageGenErrorCode =
  | 'API_KEY_NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'EMPTY_RESPONSE'
  | 'UNKNOWN'

export class ImageGenerationError extends Error {
  constructor(
    public readonly code: ImageGenErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'ImageGenerationError'
  }
}

/**
 * Generate an image via Gemini and save it to ~/.agents-room/avatars/.
 * @returns Absolute path to the saved PNG file.
 * @throws ImageGenerationError
 */
export async function generateImage(
  prompt: string,
  type: 'avatar' | 'background',
  apiKey: string
): Promise<string> {
  if (!apiKey) {
    throw new ImageGenerationError('API_KEY_NOT_CONFIGURED', 'Gemini API key not configured')
  }

  const client = new GoogleGenAI({ apiKey })

  let response
  try {
    response = await client.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: { responseModalities: ['IMAGE'] }
    })
  } catch (err: unknown) {
    throw mapApiError(err)
  }

  // Find the first part with image data
  const parts = response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))
  const imageBytes = imagePart?.inlineData?.data

  if (!imageBytes) {
    throw new ImageGenerationError('EMPTY_RESPONSE', 'No image returned by API')
  }

  // Determine extension from mime type (default png)
  const mime = imagePart?.inlineData?.mimeType ?? 'image/png'
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'

  mkdirSync(AVATARS_DIR, { recursive: true })
  const suffix = type === 'background' ? '-bg' : ''
  const filename = `${randomUUID()}${suffix}.${ext}`
  const destPath = join(AVATARS_DIR, filename)
  writeFileSync(destPath, Buffer.from(imageBytes, 'base64'))

  return destPath
}

function mapApiError(err: unknown): ImageGenerationError {
  if (err instanceof ApiError) {
    const status = (err as ApiError & { status?: number }).status
    if (status === 401 || status === 403) {
      return new ImageGenerationError('INVALID_API_KEY', err.message)
    }
    if (status === 429) {
      return new ImageGenerationError('RATE_LIMIT', err.message)
    }
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('api_key') || msg.includes('api key') || msg.includes('401') || msg.includes('unauthenticated') || msg.includes('invalid key')) {
      return new ImageGenerationError('INVALID_API_KEY', err.message)
    }
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
      return new ImageGenerationError('RATE_LIMIT', err.message)
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('enotfound') || msg.includes('econnreset')) {
      return new ImageGenerationError('NETWORK_ERROR', err.message)
    }
  }
  return new ImageGenerationError('UNKNOWN', err instanceof Error ? err.message : String(err))
}
