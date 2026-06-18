import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import { DB } from '../api/config'
import Avatar from '../components/Avatar'
import DbBadge from '../components/DbBadge'
import { Loader, ErrorNote, Empty, OkNote } from '../components/Feedback'

export default function LoginPage() {
  const { login } = useSession()
  const navigate = useNavigate()

  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [entering, setEntering] = useState(null)

  const search = async (e) => {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await mongo.searchUsers(q.trim())
      setResults(res.users)
    } catch (err) {
      setError(err); setResults(null)
    }
    setLoading(false)
  }

  const enter = async (user) => {
    setEntering(user.user_id); setError(null)
    try {
      await login(user)
      navigate('/')
    } catch (err) {
      setError(err)
    }
    setEntering(null)
  }

  return (
    <div className="login-page">
      <div className="login-hero">
        <h1 className="login-title">
          Vínculo<span className="logo-star">✶</span>
        </h1>
        <p className="login-tagline">
          Una red social. <em>Cuatro bases de datos.</em>
        </p>
        <ul className="login-db-list">
          {Object.entries(DB).map(([key, meta]) => (
            <li key={key} className="reveal" style={{ '--db': meta.color }}>
              <span className="db-dot" />
              <strong>{meta.name}</strong>
              <span className="login-db-role">
                {{
                  mongo: 'perfiles y publicaciones',
                  cassandra: 'feed y mensajería',
                  neo4j: 'el grafo de amistades',
                  redis: 'sesiones y tokens',
                }[key]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="login-panels">
        <div className="login-panel panel">
          <header className="panel-head">
            <div className="panel-title-row">
              <h2 className="panel-title">Entrar</h2>
              <DbBadge db="redis" />
              <DbBadge db="mongo" />
            </div>
          </header>
          <div className="panel-body">
            <p className="hint">
              Buscá tu usuario en MongoDB y entrá: Redis abre la sesión y emite el token.
            </p>
            <form onSubmit={search} className="search-row">
              <input
                className="input"
                placeholder="ej: luca, martina, gonzalez…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <button className="btn btn-primary" type="submit">Buscar</button>
            </form>

            {loading && <Loader label="Buscando usuarios…" />}
            <ErrorNote error={error} />
            {results?.length === 0 && <Empty>No hay usuarios que coincidan con «{q}».</Empty>}

            <ul className="login-results">
              {results?.map((u, i) => (
                <li key={u.user_id} className="login-result reveal" style={{ '--delay': `${i * 40}ms` }}>
                  <Avatar userId={u.user_id} url={u.avatar_url} name={u.display_name || u.username} size={40} />
                  <div className="login-result-info">
                    <strong>{u.display_name || u.username}</strong>
                    <span className="mono">@{u.username}</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={entering === u.user_id}
                    onClick={() => enter(u)}
                  >
                    {entering === u.user_id ? '…' : 'Entrar →'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <CreateUserPanel onCreated={(user) => enter(user)} />
      </div>
    </div>
  )
}

function CreateUserPanel({ onCreated }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(null)
  const [error, setError] = useState(null)

  const crear = async (e) => {
    e.preventDefault()
    if (!username.trim() || !displayName.trim()) return
    setBusy(true); setOk(null); setError(null)
    try {
      const user = await mongo.createUser({
        username: username.trim(),
        display_name: displayName.trim(),
        ...(email.trim() && { email: email.trim() }),
        ...(bio.trim() && { bio: bio.trim() }),
      })
      setOk(`Usuario @${user.username} creado. Iniciando sesión…`)
      setUsername(''); setDisplayName(''); setEmail(''); setBio('')
      setTimeout(() => onCreated(user), 800)
    } catch (err) {
      setError(err)
    }
    setBusy(false)
  }

  return (
    <div className="login-panel panel">
      <header className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">Crear cuenta</h2>
          <DbBadge db="mongo" />
        </div>
      </header>
      <div className="panel-body">
        <p className="hint">
          Registrá un nuevo usuario en MongoDB y entrá automáticamente.
        </p>
        <form onSubmit={crear} className="stack-form">
          <label className="field-label">Username <span className="required">*</span>
            <input
              className="input input-sm mono"
              placeholder="ej: juan_perez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="field-label">Nombre visible <span className="required">*</span>
            <input
              className="input input-sm"
              placeholder="ej: Juan Pérez"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <label className="field-label">Email
            <input
              className="input input-sm"
              type="email"
              placeholder="ej: juan@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field-label">Bio
            <input
              className="input input-sm"
              placeholder="Opcional"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={busy || !username.trim() || !displayName.trim()}>
            {busy ? 'Creando…' : 'Crear y entrar →'}
          </button>
        </form>
        <OkNote>{ok}</OkNote>
        <ErrorNote error={error} />
      </div>
    </div>
  )
}
