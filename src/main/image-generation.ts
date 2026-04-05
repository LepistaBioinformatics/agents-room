/**
 * Google Gemini Imagen API wrapper for avatar/background generation.
 * All API calls happen in the main process — the API key never reaches the renderer.
 *
 * Model: imagen-3.0-generate-fast-001 (speed-optimised for interactive use)
 * Upgrade path: imagen-4.0-generate-001 for higher quality
 */
import { GoogleGenAI, ApiError } from '@google/genai'
import { homedir } from 'os'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

const AVATARS_DIR = join(homedir(), '.agents-room', 'avatars')

// Use the fast model for interactive generation; switch to imagen-4.0-generate-001 for quality
const IMAGEN_MODEL = 'imagen-3.0-generate-fast-001'

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
 * Generate an image via Gemini Imagen and save it to ~/.agents-room/avatars/.
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
    response = await client.models.generateImages({
      model: IMAGEN_MODEL,
      prompt,
      config: { numberOfImages: 1 }
    })
  } catch (err: unknown) {
    throw mapApiError(err)
  }

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) {
    throw new ImageGenerationError('EMPTY_RESPONSE', 'No image returned by API')
  }

  // Save PNG to avatars directory
  mkdirSync(AVATARS_DIR, { recursive: true })
  const suffix = type === 'background' ? '-bg' : ''
  const filename = `${randomUUID()}${suffix}.png`
  const destPath = join(AVATARS_DIR, filename)
  writeFileSync(destPath, Buffer.from(imageBytes, 'base64'))

  return destPath
}

function mapApiError(err: unknown): ImageGenerationError {
  // Use SDK's structured ApiError when available
  if (err instanceof ApiError) {
    const status = (err as ApiError & { status?: number }).status
    if (status === 401 || status === 403) {
      return new ImageGenerationError('INVALID_API_KEY', err.message)
    }
    if (status === 429) {
      return new ImageGenerationError('RATE_LIMIT', err.message)
    }
  }
  // Fallback string matching for unexpected error shapes
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
