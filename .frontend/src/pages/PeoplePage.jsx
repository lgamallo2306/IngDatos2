import { useState } from 'react'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import { neo4j } from '../api/neo4j'
import Panel from '../components/Panel'
import UserCard from '../components/UserCard'
import Avatar from '../components/Avatar'
import { Loader, ErrorNote, Empty, OkNote } from '../components/Feedback'

export default function PeoplePage() {
  const { session } = useSession()
  const me = session.user

  return (
    <div className="layout-two-cols">
      <div className="col-main">
        <h1 className="page-title">Personas <em>y el grafo</em></h1>
        <SearchPeople me={me} />
        <FriendsExplorer me={me} />
        <RecsExplorer me={me} />
      </div>
      <aside className="col-side">
        <GraphOps me={me} />
      </aside>
    </div>
  )
}

function SearchPeople({ me }) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState({})

  const search = async (e) => {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await mongo.searchUsers(q.trim())
      setUsers(res.users)
    } catch (err) {
      setError(err); setUsers(null)
    }
    setLoading(false)
  }

  const agregar = async (username) => {
    try {
      await neo4j.crearAmistad(me.username, username)
      setAdded((p) => ({ ...p, [username]: true }))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <form onSubmit={search} className="search-row">
        <input className="input" placeholder="Buscar por nombre, usuario o bio…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-primary" type="submit">Buscar</button>
      </form>
      {loading && <Loader label="Buscando en MongoDB…" />}
      <ErrorNote error={error} />
      {users?.length === 0 && <Empty>Sin resultados para «{q}».</Empty>}
      <div className="feed-list">
        {users?.map((u, i) => (
          <UserCard
            key={u.user_id}
            user={u}
            delay={i * 35}
            action={
              u.username !== me.username && (
                <button className="btn btn-sm" disabled={added[u.username]} onClick={() => agregar(u.username)}>
                  {added[u.username] ? '✓ Amigos' : '+ Amigo'}
                </button>
              )
            }
          />
        ))}
      </div>
    </>
  )
}

function FriendsExplorer({ me }) {
  const [username, setUsername] = useState(me.username)
  const [friends, setFriends] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const buscar = async (e) => {
    e?.preventDefault()
    setLoading(true); setError(null)
    try {
      setFriends(await neo4j.amigos(username.trim()))
    } catch (err) {
      setError(err); setFriends(null)
    }
    setLoading(false)
  }

  return (
    <Panel title="Amigos de un nodo" db="neo4j" className="recs-explorer">
      <form onSubmit={buscar} className="search-row">
        <input className="input input-sm mono" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button className="btn btn-sm" type="submit">Ver relaciones</button>
      </form>
      {loading && <Loader label="Consultando aristas del nodo…" />}
      <ErrorNote error={error} />
      {friends?.length === 0 && <Empty>Este nodo no tiene conexiones aún.</Empty>}
      <ul className="rec-list">
        {friends?.map((f) => (
          <li key={f.username} className="rec-item">
            <Avatar name={f.nombre || f.username} size={32} />
            <div className="rec-info">
              <strong>{f.nombre || f.username}</strong>
              <span className="mono">@{f.username}</span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function RecsExplorer({ me }) {
  const [username, setUsername] = useState(me.username)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const buscar = async (e) => {
    e?.preventDefault()
    setLoading(true); setError(null)
    try {
      setRecs(await neo4j.recomendaciones(username.trim()))
    } catch (err) {
      setError(err); setRecs(null)
    }
    setLoading(false)
  }

  return (
    <Panel title="«Quizás conozcas a» de cualquier usuario" db="neo4j" className="recs-explorer">
      <form onSubmit={buscar} className="search-row">
        <input className="input input-sm mono" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button className="btn btn-sm" type="submit">Consultar grafo</button>
      </form>
      {loading && <Loader label="Recorriendo amigos de amigos…" />}
      <ErrorNote error={error} />
      {recs?.length === 0 && <Empty>El grafo no encontró candidatos.</Empty>}
      <ul className="rec-list">
        {recs?.map((r) => (
          <li key={r.recomendado} className="rec-item">
            <Avatar name={r.nombre || r.recomendado} size={32} />
            <div className="rec-info">
              <strong>{r.nombre || r.recomendado}</strong>
              <span className="mono">@{r.recomendado} · {r.amigos_en_comun} en común</span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/* Operaciones CRUD directas sobre el grafo de Neo4j */
function GraphOps({ me }) {
  const [ok, setOk] = useState(null)
  const [error, setError] = useState(null)

  const wrap = async (fn) => {
    setOk(null); setError(null)
    try {
      const res = await fn()
      setOk(res?.mensaje || 'Operación realizada.')
    } catch (err) {
      setError(err)
    }
  }

  const [rel1, setRel1] = useState(me.username)
  const [rel2, setRel2] = useState('')

  return (
    <Panel title="Taller del grafo" db="neo4j">
      <p className="hint">Operaciones crudas sobre los nodos y aristas de Neo4j.</p>

      <form className="stack-form graph-form" onSubmit={(e) => {
        e.preventDefault()
        if (rel1 && rel2) wrap(() => neo4j.crearRelacion(rel1.trim(), rel2.trim()))
      }}>
        <h3 className="graph-form-title">Crear arista AMIGO_DE</h3>
        <input className="input input-sm mono" placeholder="username 1" value={rel1} onChange={(e) => setRel1(e.target.value)} />
        <input className="input input-sm mono" placeholder="username 2" value={rel2} onChange={(e) => setRel2(e.target.value)} />
        <button className="btn btn-sm">Vincular —[:AMIGO_DE]→</button>
      </form>

      <OkNote>{ok}</OkNote>
      <ErrorNote error={error} />
    </Panel>
  )
}
