export type TrustTier = 'trusted' | 'known' | 'unknown'

export interface SkillSource {
  id: string
  name: string
  description: string
  owner: string
  repo: string
  path: string
  branch: string
  url: string
}

export const TRUSTED_SOURCES: SkillSource[] = [
  {
    id: 'anthropics-skills',
    name: 'Anthropic Skills',
    description: 'Official skills maintained by Anthropic',
    owner: 'anthropics',
    repo: 'skills',
    path: 'skills',
    branch: 'main',
    url: 'https://github.com/anthropics/skills'
  }
]

export function resolveTrustTier(owner: string, repo: string): TrustTier {
  const match = TRUSTED_SOURCES.find((s) => s.owner === owner && s.repo === repo)
  if (match) return 'trusted'
  return 'known'
  // Note: 'unknown' is assigned by the IPC handler when parseGitHubUrl returns null
}
