import { useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import Panel from '../components/Panel'
import PostCard from '../components/PostCard'
import UserCard from '../components/UserCard'
import { Loader, ErrorNote, Empty, OkNote } from '../components/Feedback'

const TAGS = ['python', 'gaming', 'futbol', 'ciencia', 'musica', 'humor', 'naturaleza', 'viajes']
const INTERESTS = ['ciencia', 'futbol', 'naturaleza', 'humor', 'videojuegos', 'musica', 'cine', 'viajes']

export default function ExplorePage() {
  const { session } = useSession()
  const me = session.user

  const [q, setQ] = useState('')
  // {kind:'trending'} | {kind:'search',q} | {kind:'tag',tag}
  const [query, setQuery] = useState({ kind: 'trending' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null)
      try {
        let res
        if (query.kind === 'trending') res = await mongo.trendingPosts(15)
        else if (query.kind === 'search') res = await mongo.searchPosts(query.q)
        else res = await mongo.postsByTag(query.tag, 30)
        setResult(res)
      } catch (err) {
        setError(err); setResult(null)
      }
      setLoading(false)
    })()
  }, [query])

  const heading = {
    trending: 'Tendencias',
    search: `Resultados para «${query.q}»`,
    tag: `#${query.tag}`,
  }[query.kind]

  return (
    <div className="layout-two-cols">
      <div className="col-main">
        <h1 className="page-title">Explorar <em>la red</em></h1>

        <form
          className="search-row"
          onSubmit={(e) => { e.preventDefault(); if (q.trim()) setQuery({ kind: 'search', q: q.trim() }) }}
        >
          <input
            className="input"
            placeholder="Búsqueda full-text de publicaciones…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Buscar</button>
          <button type="button" className="btn" onClick={() => { setQ(''); setQuery({ kind: 'trending' }) }}>
            ★ Tendencias
          </button>
        </form>

        <div className="tag-row tag-cloud">
          {TAGS.map((t) => (
            <button
              key={t}
              className={`tag ${query.kind === 'tag' && query.tag === t ? 'tag-active' : ''}`}
              onClick={() => setQuery({ kind: 'tag', tag: t })}
            >
              #{t}
            </button>
          ))}
        </div>

        <h2 className="section-title">{heading}</h2>
        {loading && <Loader label="Consultando MongoDB…" />}
        <ErrorNote error={error} />
        {result?.posts?.length === 0 && <Empty>No se encontraron publicaciones.</Empty>}
        <div className="feed-list">
          {result?.posts?.map((p, i) => (
            <PostCard key={p.post_id} post={p} delay={i * 35} onTagClick={(t) => setQuery({ kind: 'tag', tag: t })} />
          ))}
        </div>
      </div>

      <aside className="col-side">
        <NewPost me={me} onCreated={() => setQuery({ kind: 'trending' })} />
        <ByInterest />
      </aside>
    </div>
  )
}

function NewPost({ me, onCreated }) {
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!content.trim()) return
    setBusy(true); setError(null); setOk(null)
    try {
      await mongo.createPost({
        user_id: me.user_id,
        content: content.trim(),
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        media_urls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
        visibility,
      })
      setContent(''); setTags(''); setMediaUrl('')
      setOk('Publicación creada.')
      onCreated?.()
    } catch (err) {
      setError(err)
    }
    setBusy(false)
  }

  return (
    <Panel title="Nueva publicación" db="mongo">
      <form onSubmit={submit} className="stack-form">
        <textarea className="input" rows={3} placeholder="Contá algo…"
          value={content} onChange={(e) => setContent(e.target.value)} />
        <input className="input input-sm" placeholder="tags separados por coma"
          value={tags} onChange={(e) => setTags(e.target.value)} />
        <input className="input input-sm" placeholder="URL de imagen o link (opcional)"
          value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
        <select className="input input-sm" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="public">pública</option>
          <option value="friends">solo amigos</option>
          <option value="private">privada</option>
        </select>
        <button className="btn btn-primary" disabled={busy || !content.trim()}>
          {busy ? 'Publicando…' : 'Publicar'}
        </button>
      </form>
      <OkNote>{ok}</OkNote>
      <ErrorNote error={error} />
    </Panel>
  )
}

function ByInterest() {
  const [interest, setInterest] = useState(null)
  const [users, setUsers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const pick = async (i) => {
    setInterest(i); setLoading(true); setError(null)
    try {
      const res = await mongo.usersByInterest(i)
      setUsers(res.users)
    } catch (err) {
      setError(err); setUsers(null)
    }
    setLoading(false)
  }

  return (
    <Panel title="Personas por interés" db="mongo">
      <div className="tag-row">
        {INTERESTS.map((i) => (
          <button key={i} className={`tag ${interest === i ? 'tag-active' : ''}`} onClick={() => pick(i)}>
            {i}
          </button>
        ))}
      </div>
      {loading && <Loader />}
      <ErrorNote error={error} />
      {users?.length === 0 && <Empty>Nadie con ese interés.</Empty>}
      <div className="side-user-list">
        {users?.slice(0, 6).map((u, i) => (
          <UserCard key={u.user_id} user={u} delay={i * 40} />
        ))}
      </div>
    </Panel>
  )
}
