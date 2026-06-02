import { useState, useCallback } from 'react'

const API = 'http://localhost:5000'

function Avatar({ name }) {
  const letter = (name || '?')[0].toUpperCase()
  return <div className="avatar">{letter}</div>
}

function PostCard({ post }) {
  const autor = post.autor_user || post.autor || post.username || 'Desconocido'
  const contenido = post.contenido_texto || post.contenido || post.texto || post.body || post.content || ''
  const fecha = post.fecha_publicacion || post.fecha || post.created_at || post.date || ''
  const likes = post.likes ?? post.reactions ?? null
  const comentarios = post.comentarios ?? post.comments ?? null

  return (
    <div className="post-card">
      <div className="post-header">
        <Avatar name={autor} />
        <span className="post-author">@{autor}</span>
        {fecha && <span className="post-date">{fecha}</span>}
      </div>
      {contenido && <p className="post-body">{contenido}</p>}
      {(likes !== null || comentarios !== null) && (
        <div className="post-meta">
          {likes !== null && <span>♡ {likes}</span>}
          {comentarios !== null && <span>💬 {comentarios}</span>}
        </div>
      )}
    </div>
  )
}

function RecCard({ rec }) {
  const username = rec.recomendado || rec.username || rec.user || rec.name || '?'
  const nombre = rec.nombre || rec.display_name || null
  const comunes = rec.amigos_en_comun ?? rec.mutual_friends ?? rec.score ?? null

  return (
    <div className="rec-card">
      <Avatar name={username} />
      <div className="rec-info">
        <div className="rec-name">{nombre || username}</div>
        {nombre && <div className="rec-username">@{username}</div>}
      </div>
      {comunes !== null && (
        <span className="rec-badge">{comunes} en común</span>
      )}
    </div>
  )
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{text}</p>
    </div>
  )
}

function LoadingRow() {
  return (
    <div className="loading-row">
      <span className="spinner" style={{ borderTopColor: '#6366f1', borderColor: 'rgba(99,102,241,0.3)' }} />
      Cargando...
    </div>
  )
}

export default function FeedPanel() {
  const [inputUsername, setInputUsername] = useState('')
  const [activeUser, setActiveUser] = useState(null)

  const [feed, setFeed] = useState([])
  const [recomendaciones, setRecomendaciones] = useState([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [recLoading, setRecLoading] = useState(false)
  const [feedError, setFeedError] = useState(null)
  const [recError, setRecError] = useState(null)

  const cargarDatos = useCallback(async (username) => {
    setActiveUser(username)
    setFeed([])
    setRecomendaciones([])
    setFeedError(null)
    setRecError(null)

    setFeedLoading(true)
    setRecLoading(true)

    fetch(`${API}/api/feed?username=${encodeURIComponent(username)}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Error al cargar el feed')
        setFeed(Array.isArray(data) ? data : [])
      })
      .catch(err => setFeedError(err.message))
      .finally(() => setFeedLoading(false))

    fetch(`${API}/api/recomendaciones?username=${encodeURIComponent(username)}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'Error al cargar recomendaciones')
        setRecomendaciones(Array.isArray(data) ? data : [])
      })
      .catch(err => setRecError(err.message))
      .finally(() => setRecLoading(false))
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const u = inputUsername.trim()
    if (u) cargarDatos(u)
  }

  return (
    <div className="panel">
      <div>
        <h2 className="panel-title">Feed & Recomendaciones</h2>
        <p className="panel-description">Simula la sesión de un usuario para ver su feed y las sugerencias del algoritmo.</p>
      </div>

      <div className="card">
        <div className="card-title">
          <span className="card-icon">◉</span>
          Seleccionar usuario activo
        </div>
        <form className="session-bar" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="session-username">Username</label>
            <input
              id="session-username"
              type="text"
              placeholder="ej: maria_94"
              value={inputUsername}
              onChange={e => setInputUsername(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end' }}>
            Ver mi red
          </button>
        </form>
        {activeUser && (
          <div style={{ marginTop: 14 }}>
            <span className="active-session-badge">
              <span className="dot" />
              Sesión activa: @{activeUser}
            </span>
          </div>
        )}
      </div>

      {activeUser && (
        <div className="two-col" style={{ alignItems: 'start' }}>
          {/* Feed */}
          <div className="card">
            <div className="card-title">
              <span className="card-icon">📰</span>
              Feed de publicaciones
              {!feedLoading && <span className="count-badge">{feed.length}</span>}
            </div>
            {feedLoading && <LoadingRow />}
            {feedError && (
              <div className="alert alert-error">
                <span>✕</span> {feedError}
              </div>
            )}
            {!feedLoading && !feedError && feed.length === 0 && (
              <EmptyState icon="📭" text="No hay publicaciones en el feed. Este usuario quizás no sigue a nadie aún." />
            )}
            {!feedLoading && feed.length > 0 && (
              <div className="post-list">
                {feed.map((post, i) => <PostCard key={i} post={post} />)}
              </div>
            )}
          </div>

          {/* Recomendaciones */}
          <div className="card">
            <div className="card-title">
              <span className="card-icon">✨</span>
              Recomendaciones
              {!recLoading && <span className="count-badge">{recomendaciones.length}</span>}
            </div>
            {recLoading && <LoadingRow />}
            {recError && (
              <div className="alert alert-error">
                <span>✕</span> {recError}
              </div>
            )}
            {!recLoading && !recError && recomendaciones.length === 0 && (
              <EmptyState icon="🤷" text="Sin recomendaciones por ahora. Agrega más conexiones al grafo para que el algoritmo tenga datos." />
            )}
            {!recLoading && recomendaciones.length > 0 && (
              <div className="rec-list">
                {recomendaciones.map((rec, i) => <RecCard key={i} rec={rec} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {!activeUser && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#475569', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>◉</div>
          <p>Ingresa un username y presiona <strong style={{ color: '#94a3b8' }}>Ver mi red</strong> para comenzar.</p>
        </div>
      )}
    </div>
  )
}
