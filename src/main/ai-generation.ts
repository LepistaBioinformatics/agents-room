/**
 * Anthropic Claude API wrapper for AI-assisted agent/skill/command generation.
 * All API calls happen in the main process — the API key never reaches the renderer.
 *
 * Model: claude-sonnet-4-6 (spec-specified)
 * Strategy: single-shot, non-streaming, JSON response
 */
import Anthropic from '@anthropic-ai/sdk'
import { getSettings } from './surreal-store'

// ── Response types ────────────────────────────────────────────────────────────

export interface GenerateAgentResponse {
  name: string        // kebab-case
  description: string // one-line, under 100 chars
  model: string       // claude-opus-4 or claude-sonnet-4-6
  tools: string[]     // valid Claude Code tools
  body: string        // markdown prompt
}

export interface GenerateSkillResponse {
  name: string
  description: string
  model: string
  body: string
}

export interface GenerateCommandResponse {
  name: string  // slug
  body: string  // slash command prompt
}

export type AIErrorCode =
  | 'NO_API_KEY'
  | 'INVALID_KEY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'UNKNOWN'

export class AIGenerationError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'AIGenerationError'
  }
}

// ── System prompts ────────────────────────────────────────────────────────────

const AGENT_SYSTEM = `You are an expert Claude Code agent designer. Turn natural language descriptions into production-ready agent configurations.

Return ONLY valid JSON with this exact structure (no markdown, no commentary):
{
  "name": "kebab-case-name",
  "description": "One-line summary under 100 chars",
  "model": "claude-opus-4 or claude-sonnet-4-6",
  "tools": ["Bash", "Read", "Grep"],
  "body": "Markdown prompt with clear instructions, constraints, and examples where helpful"
}

Model selection:
- Deep code analysis, security review, complex multi-step reasoning → claude-opus-4
- Most other tasks → claude-sonnet-4-6

Tools — only include if the agent genuinely needs them. Valid options:
Bash, Read, Grep, Glob, Edit, Write, WebSearch, WebFetch, Task, TodoWrite, TodoRead

Body: structured markdown with sections (## headers), clear purpose, constraints, and behavior examples.`

const SKILL_SYSTEM = `You are an expert Claude Code skill designer. Return ONLY valid JSON (no markdown, no commentary):
{
  "name": "kebab-case-name",
  "description": "One-line summary under 100 chars",
  "model": "claude-sonnet-4-6",
  "body": "Markdown skill instructions — clear steps, expected behavior, and examples"
}`

const COMMAND_SYSTEM = `You are an expert Claude Code slash command designer. Return ONLY valid JSON (no markdown, no commentary):
{
  "name": "kebab-case-slug",
  "body": "Concise, effective prompt that Claude will receive when the user runs /name"
}`

// ── Generation model ──────────────────────────────────────────────────────────

const GENERATION_MODEL = 'claude-sonnet-4-6'

// ── Core generator ────────────────────────────────────────────────────────────

async function generate<T>(systemPrompt: string, userDescription: string): Promise<T> {
  const { anthropicApiKey } = getSettings()
  if (!anthropicApiKey) {
    throw new AIGenerationError('NO_API_KEY', 'Anthropic API key not configured')
  }

  const client = new Anthropic({ apiKey: anthropicApiKey })

  let text: string
  try {
    const message = await client.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userDescription }]
    })
    const block = message.content[0]
    text = block.type === 'text' ? block.text : ''
  } catch (err: unknown) {
    throw mapApiError(err)
  }

  // Strip optional markdown code fences (```json ... ```)
  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned) as T
  } catch {
    throw new AIGenerationError('INVALID_RESPONSE', `Failed to parse JSON response: ${text.slice(0, 200)}`)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateAgent(req: { description: string }): Promise<GenerateAgentResponse> {
  return generate<GenerateAgentResponse>(AGENT_SYSTEM, req.description)
}

export async function generateSkill(req: { description: string }): Promise<GenerateSkillResponse> {
  return generate<GenerateSkillResponse>(SKILL_SYSTEM, req.description)
}

export async function generateCommand(req: { description: string }): Promise<GenerateCommandResponse> {
  return generate<GenerateCommandResponse>(COMMAND_SYSTEM, req.description)
}

// ── Error mapping ─────────────────────────────────────────────────────────────

function mapApiError(err: unknown): AIGenerationError {
  if (err instanceof Anthropic.AuthenticationError) {
    return new AIGenerationError('INVALID_KEY', err.message)
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AIGenerationError('RATE_LIMITED', err.message)
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AIGenerationError('NETWORK_ERROR', err.message)
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (msg.includes('401') || msg.includes('authentication') || msg.includes('api_key')) {
      return new AIGenerationError('INVALID_KEY', err.message)
    }
    if (msg.includes('429') || msg.includes('rate')) {
      return new AIGenerationError('RATE_LIMITED', err.message)
    }
    if (msg.includes('network') || msg.includes('enotfound') || msg.includes('econnreset')) {
      return new AIGenerationError('NETWORK_ERROR', err.message)
    }
  }
  return new AIGenerationError('UNKNOWN', err instanceof Error ? err.message : String(err))
}
