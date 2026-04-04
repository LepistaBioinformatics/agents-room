/**
 * In-memory TTL cache for GitHub API responses.
 * Shared across all IPC calls in the main process.
 * Survives component remounts and panel open/close cycles.
 * Resets on app restart (fine for a 15-min TTL).
 */

const DEFAULT_TTL_MS = 15 * 60 * 1000 // 15 minutes

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheDelete(key: string): void {
  store.delete(key)
}

/** Remove all entries whose key starts with a given prefix. */
export function cacheDeletePrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

/**
 * Fetch with cache: returns cached value if fresh, otherwise calls `fetcher`,
 * caches the result, and returns it.
 */
export async function cacheWrap<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const cached = cacheGet<T>(key)
  if (cached !== null) return cached
  const data = await fetcher()
  cacheSet(key, data, ttlMs)
  return data
}
