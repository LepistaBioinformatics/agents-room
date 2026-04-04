import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { fetchDirectoryContents, fetchFileContent, GitHubRef } from './github-api'

const SKILLS_BASE = join(homedir(), '.claude', 'skills')

export async function installSkill(ref: GitHubRef, skillName: string): Promise<string> {
  const targetDir = join(SKILLS_BASE, skillName)
  mkdirSync(targetDir, { recursive: true })

  try {
    const entries = await fetchDirectoryContents(ref.owner, ref.repo, ref.path, ref.branch)
    const files = entries.filter((e) => e.type === 'file')

    for (const file of files) {
      const content = await fetchFileContent(ref.owner, ref.repo, file.path, ref.branch)
      writeFileSync(join(targetDir, file.name), content, 'utf-8')
    }

    return targetDir
  } catch (err) {
    rmSync(targetDir, { recursive: true, force: true })
    throw err
  }
}

export async function uninstallSkill(skillName: string): Promise<void> {
  const targetDir = join(SKILLS_BASE, skillName)
  if (!existsSync(targetDir)) {
    throw new Error(`Skill directory not found: ${targetDir}`)
  }
  rmSync(targetDir, { recursive: true })
}
