import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import { neo4j } from '../api/neo4j'
import Panel from '../components/Panel'
import Avatar from '../components/Avatar'
import DbBadge from '../components/DbBadge'
import PostCard from '../components/PostCard'
import { Loader, ErrorNote, Empty, OkNote } from '../components/Feedback'
import { fmtDate } from '../utils/fmt'

export default function ProfilePage() {
  const { username } = useParams()
  const { session, logout } = useSession()
  const isMe = session.user.username === username

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [friendMsg, setFriendMsg] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null); setUser(null); setFriendMsg(null)
      try {
        setUser(await mongo.getUser(username))
      } catch (err) {
        setError(err)
      }
      setLoading(false)
    })()
  }, [username])

  const agregarAmigo = async () => {
    try {
      await neo4j.crearAmistad(session.user.username, username)
      setFriendMsg(`Ahora sos amigo de @${username} en el grafo.`)
    } catch (err) {
      setError(err)
    }
  }

  if (loading) return <Loader label="Cargando perfil…" />
  if (error && !user) return <ErrorNote error={error} />
  if (!user) return null

  return (
    <div className="profile-page">
      <header className="profile-hero card reveal">
        <Avatar userId={user.user_id} url={user.avatar_url} name={user.display_name || user.username} size={96} />
        <div className="profile-id">
          <h1 className="profile-name">{user.display_name || user.username}</h1>
          <span className="mono profile-handle">@{user.username}</span>
          <span className="mono profile-uuid">{user.user_id}</span>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <p className="profile-meta mono">
            {user.location && <>⌖ {user.location} · </>}
            {user.website && <><a href={user.website} target="_blank" rel="noreferrer">{user.website}</a> · </>}
            miembro desde {fmtDate(user.created_at)}
          </p>
          {user.interests?.length > 0 && (
            <div className="tag-row">
              {user.interests.map((i) => <span key={i} className="tag tag-static">{i}</span>)}
            </div>
          )}
        </div>
        <div className="profile-side">
          <DbBadge db="mongo" />
          {!isMe && (
            <button className="btn btn-primary btn-sm" onClick={agregarAmigo}>+ Amigo (Neo4j)</button>
          )}
        </div>
      </header>
      <OkNote>{friendMsg}</OkNote>
      {error && <ErrorNote error={error} />}

      <div className="layout-two-cols">
        <div className="col-main">
          <UserPosts userId={user.user_id} />
        </div>
        <aside className="col-side">
          <StatsPanel userId={user.user_id} />
          {isMe && <EditProfile user={user} onSaved={setUser} />}
          {isMe && <DangerZone user={user} logout={logout} />}
        </aside>
      </div>
    </div>
  )
}

function UserPosts({ userId }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const limit = 5

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null)
      try {
        setData(await mongo.postsByUser(userId, page, limit))
      } catch (err) {
        setError(err)
      }
      setLoading(false)
    })()
  }, [userId, page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1

  return (
    <>
      <h2 className="section-title">Publicaciones {data && <span className="mono">({data.total})</span>}</h2>
      {loading && <Loader label="Cargando publicaciones…" />}
      <ErrorNote error={error} />
      {data?.posts?.length === 0 && <Empty>Este usuario no publicó nada.</Empty>}
      <div className="feed-list">
        {data?.posts?.map((p, i) => <PostCard key={p.post_id} post={p} delay={i * 35} />)}
      </div>
      {data && data.total > limit && (
        <div className="pager">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
          <span className="mono">página {page} / {totalPages}</span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
        </div>
      )}
    </>
  )
}

function StatsPanel({ userId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        setData(await mongo.getUserStats(userId))
      } catch (err) {
        setError(err)
      }
    })()
  }, [userId])

  const stats = data?.stats
  const topTags = stats ? [...new Set(stats.tags_used)].slice(0, 8) : []

  return (
    <Panel title="Estadísticas" db="mongo">
      <ErrorNote error={error} />
      {stats && (
        <>
          <dl className="stats-grid">
            <div><dt>Posts</dt><dd>{stats.total_posts}</dd></div>
            <div><dt>Likes</dt><dd>{stats.total_likes}</dd></div>
            <div><dt>Comentarios</dt><dd>{stats.total_comments}</dd></div>
            <div><dt>Promedio ♥</dt><dd>{stats.avg_likes}</dd></div>
            <div><dt>Mejor post</dt><dd>{stats.max_likes} ♥</dd></div>
          </dl>
          {topTags.length > 0 && (
            <div className="tag-row">
              {topTags.map((t) => <span key={t} className="tag tag-static">#{t}</span>)}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

function DangerZone({ user, logout }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const eliminar = async () => {
    if (!window.confirm(`¿Seguro que querés eliminar la cuenta @${user.username}? Esta acción es irreversible.`)) return
    setBusy(true)
    try {
      await mongo.deleteUser(user.user_id)
      await logout()
      navigate('/login')
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <Panel title="Zona peligrosa" db="mongo">
      <p className="hint">Eliminar tu cuenta borra tu perfil de MongoDB permanentemente.</p>
      <button className="btn btn-sm danger" disabled={busy} onClick={eliminar}>
        {busy ? 'Eliminando…' : 'Eliminar mi cuenta'}
      </button>
      <ErrorNote error={error} />
    </Panel>
  )
}

function EditProfile({ user, onSaved }) {
  const [bio, setBio] = useState(user.bio || '')
  const [location, setLocation] = useState(user.location || '')
  const [website, setWebsite] = useState(user.website || '')
  const [displayName, setDisplayName] = useState(user.display_name || '')
  const [interests, setInterests] = useState((user.interests || []).join(', '))
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(null)
  const [error, setError] = useState(null)

  const save = async (e) => {
    e.preventDefault()
    setBusy(true); setOk(null); setError(null)
    try {
      const updated = await mongo.updateUser(user.user_id, {
        bio, location, website,
        display_name: displayName,
        interests: interests.split(',').map((i) => i.trim()).filter(Boolean),
      })
      onSaved?.(updated)
      setOk('Perfil actualizado.')
    } catch (err) {
      setError(err)
    }
    setBusy(false)
  }

  return (
    <Panel title="Editar perfil" db="mongo">
      <form onSubmit={save} className="stack-form">
        <label className="field-label">Nombre visible
          <input className="input input-sm" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field-label">Bio
          <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <label className="field-label">Ubicación
          <input className="input input-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="field-label">Sitio web
          <input className="input input-sm" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
        <label className="field-label">Intereses (coma)
          <input className="input input-sm" value={interests} onChange={(e) => setInterests(e.target.value)} />
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </form>
      <OkNote>{ok}</OkNote>
      <ErrorNote error={error} />
    </Panel>
  )
}
