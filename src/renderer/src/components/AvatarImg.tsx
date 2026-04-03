import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface Props {
  path: string | undefined
  size: number
  className?: string
  rounded?: 'full' | 'xl' | 'lg'
}

export function AvatarImg({ path, size, className = '', rounded = 'full' }: Props): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setDataUrl(null); return }
    let cancelled = false
    window.electronAPI.avatar.read(path).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => { cancelled = true }
  }, [path])

  const roundedClass = rounded === 'full' ? 'rounded-full' : rounded === 'xl' ? 'rounded-xl' : 'rounded-lg'

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex shrink-0 items-center justify-center ${roundedClass} bg-ag-surface-2 border border-ag-border/60 ${className}`}
      >
        <User size={size * 0.45} className="text-ag-text-3" />
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt=""
      style={{ width: size, height: size }}
      className={`shrink-0 object-cover ${roundedClass} border border-ag-border/60 ${className}`}
    />
  )
}
