import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface Props {
  path: string | undefined
  size?: number           // fixed px dimensions (default)
  fill?: boolean          // fills parent container — ignores size
  className?: string
  rounded?: 'none' | 'full' | 'xl' | 'lg'
}

export function AvatarImg({ path, size, fill, className = '', rounded = 'none' }: Props): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!path) { setDataUrl(null); return }
    let cancelled = false
    window.electronAPI.avatar.read(path).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => { cancelled = true }
  }, [path])

  const roundedClass =
    rounded === 'full' ? 'rounded-full' :
    rounded === 'xl'   ? 'rounded-xl' :
    rounded === 'lg'   ? 'rounded-lg' :
    'rounded-none'

  const sizeStyle = fill ? {} : { width: size ?? 32, height: size ?? 32 }
  const sizeClass = fill ? 'w-full h-full' : 'shrink-0'
  const iconSize  = fill ? 24 : (size ?? 32) * 0.45

  if (!dataUrl) {
    return (
      <div
        style={sizeStyle}
        className={`flex items-center justify-center ${sizeClass} ${roundedClass} bg-ag-surface-2 border border-ag-border/60 ${className}`}
      >
        <User size={iconSize} className="text-ag-text-3" />
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt=""
      style={sizeStyle}
      className={`object-cover ${sizeClass} ${roundedClass} ${className}`}
    />
  )
}
