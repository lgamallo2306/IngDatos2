import { avatarUrl } from '../utils/fmt'

export default function Avatar({ userId, url, name = '?', size = 40 }) {
  const src = url || (userId ? avatarUrl(userId) : null)
  const initials = name.split(/[\s_]+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      <span className="avatar-initials">{initials}</span>
      {src && <img src={src} alt={name} loading="lazy" onError={(e) => { e.target.style.display = 'none' }} />}
    </span>
  )
}
