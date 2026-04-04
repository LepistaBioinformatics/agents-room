import matter from 'gray-matter'

export interface GitHubRef {
  owner: string
  repo: string
  path: string
  branch: string
}

export interface GitHubRepoInfo {
  stars: number
  orgName: string | null
  description: string | null
  updatedAt: string
}

export interface GitHubDirEntry {
  name: string
  type: 'file' | 'dir'
  download_url: string | null
  path: string
}

export class GitHubError extends Error {
  code: 'GH_NOT_FOUND' | 'GH_RATE_LIMITED' | 'GH_NO_SKILL_MD'
  resetAt?: number

  constructor(code: 'GH_NOT_FOUND' | 'GH_RATE_LIMITED' | 'GH_NO_SKILL_MD', resetAt?: number) {
    super(code)
    this.name = 'GitHubError'
    this.code = code
    this.resetAt = resetAt
  }
}

export function parseGitHubUrl(url: string): GitHubRef | null {
  if (typeof url !== 'string') return null

  const trimmed = url.trim().replace(/\/+$/, '')

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return null
  }

  if (parsed.hostname !== 'github.com') return null

  // pathname starts with '/', split into segments dropping the empty first element
  const segments = parsed.pathname.split('/').filter((s) => s.length > 0)

  // Must have at least owner and repo
  if (segments.length < 2) return null

  const owner = segments[0]
  const repo = segments[1]

  // https://github.com/owner/repo
  if (segments.length === 2) {
    return { owner, repo, path: '', branch: 'main' }
  }

  // https://github.com/owner/repo/tree/branch/...
  // https://github.com/owner/repo/blob/branch/...
  const refType = segments[2]
  if (refType === 'tree' || refType === 'blob') {
    if (segments.length < 4) {
      // /tree/ with no branch — treat as root on main
      return { owner, repo, path: '', branch: 'main' }
    }
    const branch = segments[3]
    const path = segments.slice(4).join('/')
    return { owner, repo, path, branch }
  }

  // Unrecognised URL shape (e.g. /issues, /pulls, etc.)
  return null
}

let _token: string | null = null

export function setGitHubToken(token: string | null): void {
  _token = token
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  return headers
}

async function handleGitHubResponse(res: Response): Promise<void> {
  if (res.ok) return

  if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
    const reset = Number(res.headers.get('X-RateLimit-Reset'))
    throw new GitHubError('GH_RATE_LIMITED', reset)
  }

  if (res.status === 404) {
    throw new GitHubError('GH_NOT_FOUND')
  }

  throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
}

export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo> {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  const res = await fetch(url, { headers: getHeaders() })
  await handleGitHubResponse(res)

  const data = (await res.json()) as {
    stargazers_count: number
    organization?: { login: string } | null
    description: string | null
    updated_at: string
  }

  return {
    stars: data.stargazers_count,
    orgName: data.organization?.login ?? null,
    description: data.description,
    updatedAt: data.updated_at
  }
}

export async function fetchDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<GitHubDirEntry[]> {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, { headers: getHeaders() })
  await handleGitHubResponse(res)

  const data = (await res.json()) as Array<{
    name: string
    type: string
    download_url: string | null
    path: string
  }>

  return data.map((entry) => ({
    name: entry.name,
    type: entry.type === 'dir' ? 'dir' : 'file',
    download_url: entry.download_url,
    path: entry.path
  }))
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<string> {
  const encodedPath = path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, { headers: getHeaders() })
  await handleGitHubResponse(res)

  const data = (await res.json()) as {
    content: string
    encoding: string
  }

  return Buffer.from(data.content, 'base64').toString('utf-8')
}

export async function fetchSkillPreview(ref: GitHubRef): Promise<{
  name: string
  description: string
  model: string | null
  folderName: string
  sourceUrl: string
  files: string[]
}> {
  const entries = await fetchDirectoryContents(ref.owner, ref.repo, ref.path, ref.branch)

  const skillMdEntry = entries.find((e) => e.name === 'SKILL.md')
  if (!skillMdEntry) {
    throw new GitHubError('GH_NO_SKILL_MD')
  }

  const skillMdContent = await fetchFileContent(
    ref.owner,
    ref.repo,
    skillMdEntry.path,
    ref.branch
  )

  const parsed = matter(skillMdContent)
  const frontmatter = parsed.data as {
    name?: string
    description?: string
    model?: string
  }

  const folderName =
    ref.path.length > 0
      ? ref.path.split('/').filter((s) => s.length > 0).pop() ?? ref.repo
      : ref.repo

  const sourceUrl = `https://github.com/${ref.owner}/${ref.repo}/tree/${ref.branch}/${ref.path}`

  return {
    name: frontmatter.name ?? '',
    description: frontmatter.description ?? '',
    model: frontmatter.model ?? null,
    folderName,
    sourceUrl,
    files: entries.map((e) => e.name)
  }
}
