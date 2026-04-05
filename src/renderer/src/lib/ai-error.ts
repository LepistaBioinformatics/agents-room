/** Maps AI generation error codes to user-friendly messages. */
export function mapAIError(code: string | undefined): string {
  switch (code) {
    case 'NO_API_KEY':       return 'Anthropic API key not configured. Open Settings.'
    case 'INVALID_KEY':      return 'Authentication failed. Check your API key in Settings.'
    case 'RATE_LIMITED':     return 'API rate limit reached. Wait a moment and retry.'
    case 'NETWORK_ERROR':    return 'Network error. Check your connection.'
    case 'INVALID_RESPONSE': return 'Generation returned unexpected content. Try again.'
    default:                 return 'Generation failed. Try again.'
  }
}
