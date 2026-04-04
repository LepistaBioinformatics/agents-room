import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import type { UpdateStatus } from '../preload/updater-types'

export type { UpdateStatus }

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

export function initUpdater(): void {
  if (is.dev) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => broadcast({ type: 'checking' }))

  autoUpdater.on('update-available', (info) => {
    broadcast({ type: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => broadcast({ type: 'not-available' }))

  autoUpdater.on('download-progress', (progress) => {
    broadcast({ type: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    broadcast({ type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    broadcast({ type: 'error', message: err.message })
  })

  // Check on startup after a short delay so the window is ready
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000)
}

export function checkForUpdates(): void {
  if (is.dev) return
  autoUpdater.checkForUpdates().catch(() => {})
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
