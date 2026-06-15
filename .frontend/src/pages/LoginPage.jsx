import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import { cassandra } from '../api/cassandra'
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
  const [seedMsg, setSeedMsg] = useState(null)
  const [seedErr, setSeedErr] = useState(null)

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

  const cargarCassandra = async () => {
    setSeedMsg(null); setSeedErr(null)
    try {
      const res = await cassandra.cargarDataset()
      setSeedMsg(`Dataset cargado: ${res.feed_insertados} entradas de feed, ${res.mensajes_insertados} mensajes.`)
    } catch (err) {
      setSeedErr(err)
    }
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
        <div className="login-tools">
          <button className="btn btn-sm" onClick={cargarCassandra}>
            ⟳ Cargar dataset en Cassandra
          </button>
          <OkNote>{seedMsg}</OkNote>
          <ErrorNote error={seedErr} />
        </div>
      </div>

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
    </div>
  )
}
