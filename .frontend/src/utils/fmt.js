export function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff > -60 && diff < 60) return 'ahora'
  if (diff > 0 && diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff > 0 && diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function shortId(id) {
  return id ? String(id).slice(0, 8) : '—'
}

export function avatarUrl(userId) {
  return `https://i.pravatar.cc/300?u=${userId}`
}

export function groupBy(list, keyFn) {
  const out = new Map()
  for (const item of list || []) {
    const k = keyFn(item)
    if (!out.has(k)) out.set(k, [])
    out.get(k).push(item)
  }
  return out
}
