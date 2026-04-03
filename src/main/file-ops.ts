/**
 * File system operations for agent/skill/command management.
 * Copy, duplicate, logical trash, restore, permanent delete.
 */
import { copyFile, cp, mkdir, rename, rm, readdir } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname, basename, extname } from 'path'
import { homedir } from 'os'
import { addTrashRecord, removeTrashRecord, getTrashRecord, TrashRecord } from './surreal-store'

type ItemType = 'agent' | 'skill' | 'command'

// ── Utilities ─────────────────────────────────────────────────────────────────

function getTrashDir(workspacePath: string, itemType: ItemType): string {
  const base = workspacePath === '' ? join(homedir(), '.claude') : join(workspacePath, '.claude')
  return join(base, '.trash', itemType + 's')
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function uniquePath(targetPath: string): Promise<string> {
  if (!existsSync(targetPath)) return targetPath
  const ext = extname(targetPath)
  const base = targetPath.slice(0, targetPath.length - ext.length)
  let counter = 1
  while (existsSync(`${base}-copy${counter > 1 ? counter : ''}${ext}`)) counter++
  return counter === 1 ? `${base}-copy${ext}` : `${base}-copy${counter}${ext}`
}

async function uniqueFolderPath(targetPath: string): Promise<string> {
  if (!existsSync(targetPath)) return targetPath
  let counter = 1
  while (existsSync(`${targetPath}-copy${counter > 1 ? counter : ''}`)) counter++
  return counter === 1 ? `${targetPath}-copy` : `${targetPath}-copy${counter}`
}

// ── Copy ──────────────────────────────────────────────────────────────────────

export async function copyItem(
  srcPath: string,
  targetWorkspacePath: string,
  itemType: ItemType
): Promise<void> {
  const clauDir = targetWorkspacePath === ''
    ? join(homedir(), '.claude')
    : join(targetWorkspacePath, '.claude')

  let targetDir: string
  if (itemType === 'agent') targetDir = join(clauDir, 'agents')
  else if (itemType === 'skill') targetDir = join(clauDir, 'skills')
  else targetDir = join(clauDir, 'commands')

  ensureDir(targetDir)

  if (itemType === 'skill') {
    // Skills are folders
    const targetPath = await uniqueFolderPath(join(targetDir, basename(srcPath)))
    await cp(srcPath, targetPath, { recursive: true })
  } else {
    const targetPath = await uniquePath(join(targetDir, basename(srcPath)))
    await copyFile(srcPath, targetPath)
  }
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateItem(srcPath: string, itemType: ItemType): Promise<void> {
  const dir = dirname(srcPath)

  if (itemType === 'skill') {
    const targetPath = await uniqueFolderPath(srcPath)
    await cp(srcPath, targetPath, { recursive: true })
  } else {
    const targetPath = await uniquePath(srcPath)
    await copyFile(srcPath, targetPath)
  }
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export async function trashItem(
  srcPath: string,
  workspacePath: string,
  itemType: ItemType,
  itemName: string
): Promise<TrashRecord> {
  const trashDir = getTrashDir(workspacePath, itemType)
  ensureDir(trashDir)

  const trashPath = await (itemType === 'skill'
    ? uniqueFolderPath(join(trashDir, basename(srcPath)))
    : uniquePath(join(trashDir, basename(srcPath))))

  if (itemType === 'skill') {
    await cp(srcPath, trashPath, { recursive: true })
    await rm(srcPath, { recursive: true, force: true })
  } else {
    await rename(srcPath, trashPath)
  }

  return addTrashRecord({
    originalPath: srcPath,
    trashPath,
    itemName,
    itemType,
    workspacePath
  })
}

// ── Restore ───────────────────────────────────────────────────────────────────

export interface RestoreResult {
  success: boolean
  needsNewLocation?: boolean
  itemName?: string
}

export async function restoreItem(trashId: string): Promise<RestoreResult> {
  const record = getTrashRecord(trashId)
  if (!record) return { success: false }

  const originalDir = dirname(record.originalPath)

  if (!existsSync(originalDir)) {
    return { success: false, needsNewLocation: true, itemName: record.itemName }
  }

  const destPath = await (record.itemType === 'skill'
    ? uniqueFolderPath(record.originalPath)
    : uniquePath(record.originalPath))

  if (record.itemType === 'skill') {
    await cp(record.trashPath, destPath, { recursive: true })
    await rm(record.trashPath, { recursive: true, force: true })
  } else {
    await rename(record.trashPath, destPath)
  }

  removeTrashRecord(trashId)
  return { success: true }
}

// ── Permanent delete ──────────────────────────────────────────────────────────

export async function permanentlyDeleteItem(trashId: string): Promise<void> {
  const record = getTrashRecord(trashId)
  if (!record) return

  if (existsSync(record.trashPath)) {
    await rm(record.trashPath, { recursive: true, force: true })
  }

  removeTrashRecord(trashId)
}
