export function Loader({ label = 'Cargando…' }) {
  return (
    <div className="feedback loader">
      <span className="spinner" /> {label}
    </div>
  )
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <div className="feedback error-note">✕ {String(error.message || error)}</div>
}

export function Empty({ children = 'Nada por aquí todavía.' }) {
  return <div className="feedback empty">✶ {children}</div>
}

export function OkNote({ children }) {
  if (!children) return null
  return <div className="feedback ok-note">✓ {children}</div>
}
