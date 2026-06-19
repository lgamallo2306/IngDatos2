import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { cassandra } from '../api/cassandra'
import { neo4j } from '../api/neo4j'
import { mongo } from '../api/mongo'
import Panel from '../components/Panel'
import Avatar from '../components/Avatar'
import DbBadge from '../components/DbBadge'
import { Loader, ErrorNote, Empty } from '../components/Feedback'
import { fmtDate, shortId } from '../utils/fmt'

const POST_TYPES = ['text', 'photo', 'video', 'link']

export default function FeedPage() {
  const { session, validar } = useSession()
  const me = session.user

  return (
    <div className="layout-two-cols">
      <div className="col-main">
        <h1 className="page-title">
          Hola, <em>{(me.display_name || me.username).split(' ')[0]}</em>
        </h1>

        <CassandraFeed me={me} />
      </div>

      <aside className="col-side">
        <SessionPanel session={session} validar={validar} />
        <Recommendations me={me} />
        <MyStats me={me} />
      </aside>
    </div>
  )
}

/* ---------------- Feed de Cassandra con todas sus queries ---------------- */

function CassandraFeed({ me }) {
  const [mode, setMode] = useState('todo')
  const [n, setN] = useState(10)
  const [tipo, setTipo] = useState('text')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [autor, setAutor] = useState('')

  const [entries, setEntries] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let data
      if (mode === 'todo') data = await cassandra.feed(me.user_id)
      else if (mode === 'ultimos') data = await cassandra.feedUltimos(me.user_id, n)
      else if (mode === 'tipo') data = await cassandra.feedPorTipo(me.user_id, tipo)
      else if (mode === 'rango') {
        if (!desde || !hasta) { setLoading(false); return }
        data = await cassandra.feedRango(me.user_id, new Date(desde).toISOString(), new Date(hasta + 'T23:59:59').toISOString())
      } else if (mode === 'autor') {
        if (!autor.trim()) { setLoading(false); return }
        data = await cassandra.feedPorAutor(autor.trim())
      }
      setEntries(data)
    } catch (err) {
      setError(err); setEntries(null)
    }
    setLoading(false)
  }, [mode, n, tipo, desde, hasta, autor, me.user_id])

  useEffect(() => { load() }, [load])

  const eliminar = async (entry) => {
    try {
      await cassandra.eliminarFeed(entry.ownerUserId, entry.createdAt, entry.postId)
      setEntries((prev) => prev.filter((x) => x.postId !== entry.postId || x.createdAt !== entry.createdAt))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <div className="filter-bar">
        <select className="input input-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="todo">Todo el feed</option>
          <option value="ultimos">Últimos N</option>
          <option value="tipo">Por tipo</option>
          <option value="rango">Rango de fechas</option>
          <option value="autor">Por autor (global)</option>
        </select>
        {mode === 'ultimos' && (
          <input className="input input-sm" type="number" min="1" max="100" value={n}
            onChange={(e) => setN(Number(e.target.value) || 1)} style={{ width: 80 }} />
        )}
        {mode === 'tipo' && (
          <select className="input input-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        {mode === 'rango' && (
          <>
            <input className="input input-sm" type="date" lang="es" value={desde} onChange={(e) => setDesde(e.target.value)} />
            <span className="mono">→</span>
            <input className="input input-sm" type="date" lang="es" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </>
        )}
        {mode === 'autor' && (
          <input className="input input-sm mono" placeholder="UUID del autor" value={autor}
            onChange={(e) => setAutor(e.target.value)} style={{ flex: 1 }} />
        )}
        <button className="btn btn-sm" onClick={load}>⟳</button>
      </div>

      {loading && <Loader label="Consultando Cassandra…" />}
      <ErrorNote error={error} />
      {entries?.length === 0 && <Empty>Tu feed está vacío. Probá «Cargar dataset» desde la pantalla de entrada.</Empty>}

      <div className="feed-list">
        {entries?.map((e, i) => (
          <article key={`${e.postId}-${e.createdAt}`} className="card feed-entry reveal" style={{ '--delay': `${i * 35}ms` }}>
            <header className="post-head">
              <Avatar userId={e.authorId} name={e.authorUsername || '?'} size={42} />
              <div className="post-who">
                <span className="post-author">@{e.authorUsername || shortId(e.authorId)}</span>
                <span className="post-meta">{fmtDate(e.createdAt)} · <span className="type-chip">{e.postType}</span></span>
              </div>
              <DbBadge db="cassandra" />
            </header>
            <p className="post-content">{e.contentPreview}</p>
            <footer className="post-foot">
              <span className="mono post-comments">post {shortId(e.postId)}…</span>
              {mode !== 'autor' && (
                <button className="btn btn-ghost btn-sm danger" onClick={() => eliminar(e)}>Eliminar</button>
              )}
            </footer>
          </article>
        ))}
      </div>
    </>
  )
}

/* ---------------- Paneles laterales ---------------- */

function SessionPanel({ session, validar }) {
  const { logout } = useSession()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const check = async () => {
    setBusy(true); setError(null); setInfo(null)
    try {
      setInfo(await validar())
    } catch (err) {
      await logout()
    }
    setBusy(false)
  }

  return (
    <Panel title="Sesión" db="redis">
      <p className="mono session-token">{session.token}</p>
      <button className="btn btn-sm" onClick={check} disabled={busy}>
        {busy ? 'Validando…' : 'Validar sesión'}
      </button>
      <ErrorNote error={error} />
      {info && (
        <div className="session-info ok-note feedback">
          ✓ {info.mensaje} — @{info.usuario?.username} desde {info.usuario?.ip_address || 'IP desconocida'}
        </div>
      )}
    </Panel>
  )
}

function Recommendations({ me }) {
  const [recs, setRecs] = useState(null)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState({})

  useEffect(() => {
    (async () => {
      try {
        setRecs(await neo4j.recomendaciones(me.username))
      } catch (err) {
        setError(err)
      }
    })()
  }, [me.username])

  const agregar = async (username) => {
    try {
      await neo4j.crearAmistad(me.username, username)
      setAdded((p) => ({ ...p, [username]: true }))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <Panel title="Quizás conozcas a" db="neo4j">
      <ErrorNote error={error} />
      {recs?.length === 0 && <Empty>Sin recomendaciones aún.</Empty>}
      <ul className="rec-list">
        {recs?.map((r) => (
          <li key={r.recomendado} className="rec-item">
            <Avatar name={r.nombre || r.recomendado} size={32} />
            <div className="rec-info">
              <strong>{r.nombre || r.recomendado}</strong>
              <span className="mono">{r.amigos_en_comun} amigos en común</span>
            </div>
            <button
              className="btn btn-sm"
              disabled={added[r.recomendado]}
              onClick={() => agregar(r.recomendado)}
            >
              {added[r.recomendado] ? '✓' : '+ Amigo'}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function MyStats({ me }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await mongo.getUserStats(me.user_id)
        setStats(res.stats)
      } catch (err) {
        setError(err)
      }
    })()
  }, [me.user_id])

  return (
    <Panel title="Mis números" db="mongo">
      <ErrorNote error={error} />
      {stats && (
        <dl className="stats-grid">
          <div><dt>Posts</dt><dd>{stats.total_posts}</dd></div>
          <div><dt>Likes</dt><dd>{stats.total_likes}</dd></div>
          <div><dt>Comentarios</dt><dd>{stats.total_comments}</dd></div>
          <div><dt>Mejor post</dt><dd>{stats.max_likes} ♥</dd></div>
        </dl>
      )}
      <Link to={`/perfil/${me.username}`} className="mono post-permalink">ver mi perfil →</Link>
    </Panel>
  )
}
