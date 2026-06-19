import { useState, useEffect, useCallback } from 'react'
import { useSession } from '../context/SessionContext'
import { mongo } from '../api/mongo'
import { neo4j } from '../api/neo4j'
import Panel from '../components/Panel'
import UserCard from '../components/UserCard'
import Avatar from '../components/Avatar'
import { Loader, ErrorNote, Empty, OkNote } from '../components/Feedback'
import FriendsGraph from '../components/FriendsGraph'

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
  const [searchError, setSearchError] = useState(null)
  const [addError, setAddError] = useState(null)
  const [added, setAdded] = useState({})

  const search = async (e) => {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true); setSearchError(null); setAddError(null)
    try {
      const res = await mongo.searchUsers(q.trim())
      setUsers(res.users)
    } catch (err) {
      setSearchError(err); setUsers(null)
    }
    setLoading(false)
  }

  const agregar = async (username) => {
    setAddError(null)
    try {
      await neo4j.crearAmistad(me.username, username)
      setAdded((p) => ({ ...p, [username]: true }))
    } catch (err) {
      setAddError(err)
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
      <ErrorNote error={searchError} />
      <ErrorNote error={addError} />
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
  const [view, setView] = useState('lista')
  const [tipo, setTipo] = useState('amigos')

  const fetchRelaciones = useCallback(async (u, t) => {
    if (!u.trim()) return
    setLoading(true); setError(null); setView('lista')
    try {
      let data
      if (t === 'amigos') {
        data = (await neo4j.amigos(u)).map(f => ({ ...f, relType: 'AMIGO_DE' }))
      } else if (t === 'familiares') {
        data = (await neo4j.familiares(u)).map(f => ({ ...f, relType: 'FAMILIAR_DE' }))
      } else {
        const [amigos, familiares] = await Promise.all([neo4j.amigos(u), neo4j.familiares(u)])
        data = [
          ...amigos.map(f => ({ ...f, relType: 'AMIGO_DE' })),
          ...familiares.map(f => ({ ...f, relType: 'FAMILIAR_DE' })),
        ]
      }
      setFriends(data)
    } catch (err) {
      setError(err); setFriends(null)
    }
    setLoading(false)
  }, [])

  const buscar = (e) => { e?.preventDefault(); fetchRelaciones(username.trim(), tipo) }
  const changeTipo = (t) => { setTipo(t); fetchRelaciones(username.trim(), t) }

  const eliminarRelacion = async (f) => {
    try {
      const fn = f.relType === 'FAMILIAR_DE' ? neo4j.eliminarFamiliar : neo4j.eliminarAmistad
      await fn(username.trim(), f.username)
      setFriends(prev => prev.filter(x => !(x.username === f.username && x.relType === f.relType)))
    } catch (err) {
      setError(err)
    }
  }

  useEffect(() => { fetchRelaciones(username, 'amigos') }, [fetchRelaciones])

  const viewToggle = friends?.length > 0 && (
    <div className="view-toggle">
      <button className={`btn btn-xs${view === 'lista' ? ' btn-primary' : ''}`} onClick={() => setView('lista')}>Lista</button>
      <button className={`btn btn-xs${view === 'grafo' ? ' btn-primary' : ''}`} onClick={() => setView('grafo')}>Grafo</button>
    </div>
  )

  const REL_TYPES = [
    { key: 'amigos', label: 'Amigos' },
    { key: 'familiares', label: 'Familiares' },
    { key: 'todos', label: 'Todos' },
  ]

  return (
    <Panel title="Relaciones del nodo" db="neo4j" className="recs-explorer" actions={viewToggle}>
      <form onSubmit={buscar} className="search-row">
        <input className="input input-sm mono" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button className="btn btn-sm" type="submit">Ver relaciones</button>
      </form>
      <div className="view-toggle" style={{ alignSelf: 'flex-start' }}>
        {REL_TYPES.map(rt => (
          <button
            key={rt.key}
            className={`btn btn-xs${tipo === rt.key ? ' btn-primary' : ''}`}
            onClick={() => changeTipo(rt.key)}
          >{rt.label}</button>
        ))}
      </div>
      {loading && <Loader label="Consultando aristas del nodo…" />}
      <ErrorNote error={error} />
      {friends?.length === 0 && (
        <Empty>
          «{username}» no tiene relaciones de tipo {tipo === 'amigos' ? 'AMIGO_DE' : tipo === 'familiares' ? 'FAMILIAR_DE' : 'ningún tipo'} en el grafo.
          Probá con otro username o creá relaciones desde el panel derecho.
        </Empty>
      )}
      {view === 'lista'
        ? (
          <ul className="rec-list">
            {friends?.map((f) => (
              <li key={`${f.username}-${f.relType}`} className="rec-item">
                <Avatar name={f.nombre || f.username} size={32} />
                <div className="rec-info">
                  <strong>{f.nombre || f.username}</strong>
                  <span className="mono">@{f.username}</span>
                </div>
                <span className={`rel-chip ${f.relType === 'FAMILIAR_DE' ? 'familiar' : 'amigo'}`}>
                  {f.relType}
                </span>
                <button
                  className="btn btn-ghost btn-xs danger"
                  onClick={() => eliminarRelacion(f)}
                >✕</button>
              </li>
            ))}
          </ul>
        )
        : friends && <FriendsGraph center={username} friends={friends} />
      }
    </Panel>
  )
}

function RecsExplorer({ me }) {
  const [username, setUsername] = useState(me.username)
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [added, setAdded] = useState({})

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

  const agregar = async (recUsername) => {
    try {
      await neo4j.crearAmistad(me.username, recUsername)
      setAdded((p) => ({ ...p, [recUsername]: true }))
    } catch (err) {
      setError(err)
    }
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
            <button
              className="btn btn-sm"
              disabled={added[r.recomendado]}
              onClick={() => agregar(r.recomendado)}
            >
              {added[r.recomendado] ? '✓ Amigos' : '+ Amigo'}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function RelForm({ title, u1, setU1, u2, setU2, onSubmit, btnLabel, ok, err }) {
  return (
    <>
      <form className="stack-form graph-form" onSubmit={onSubmit}>
        <h3 className="graph-form-title">{title}</h3>
        <input className="input input-sm mono" placeholder="username 1" value={u1} onChange={(e) => setU1(e.target.value)} />
        <input className="input input-sm mono" placeholder="username 2 (requerido)" value={u2} onChange={(e) => setU2(e.target.value)} />
        <button className="btn btn-sm" type="submit">{btnLabel}</button>
      </form>
      <OkNote>{ok}</OkNote>
      <ErrorNote error={err} />
    </>
  )
}

/* Operaciones CRUD directas sobre el grafo de Neo4j */
function GraphOps({ me }) {
  const [ca1, setCa1] = useState(me.username); const [ca2, setCa2] = useState(''); const [caOk, setCaOk] = useState(null); const [caErr, setCaErr] = useState(null)
  const [cf1, setCf1] = useState(me.username); const [cf2, setCf2] = useState(''); const [cfOk, setCfOk] = useState(null); const [cfErr, setCfErr] = useState(null)
  const [da1, setDa1] = useState(me.username); const [da2, setDa2] = useState(''); const [daOk, setDaOk] = useState(null); const [daErr, setDaErr] = useState(null)
  const [df1, setDf1] = useState(me.username); const [df2, setDf2] = useState(''); const [dfOk, setDfOk] = useState(null); const [dfErr, setDfErr] = useState(null)

  const handle = (apiFn, setOk, setErr) => async (e) => {
    e.preventDefault()
    setOk(null); setErr(null)
    try {
      const res = await apiFn()
      setOk(res?.mensaje || 'Operación realizada.')
    } catch (err) { setErr(err) }
  }

  return (
    <Panel title="Taller del grafo" db="neo4j">
      <p className="hint">Operaciones crudas sobre los nodos y aristas de Neo4j.</p>

      <RelForm
        title="Crear arista AMIGO_DE"
        u1={ca1} setU1={setCa1} u2={ca2} setU2={setCa2}
        onSubmit={handle(() => neo4j.crearAmistad(ca1.trim(), ca2.trim()), setCaOk, setCaErr)}
        btnLabel="Vincular —[:AMIGO_DE]→" ok={caOk} err={caErr}
      />

      <RelForm
        title="Crear arista FAMILIAR_DE"
        u1={cf1} setU1={setCf1} u2={cf2} setU2={setCf2}
        onSubmit={handle(() => neo4j.crearFamiliar(cf1.trim(), cf2.trim()), setCfOk, setCfErr)}
        btnLabel="Vincular —[:FAMILIAR_DE]→" ok={cfOk} err={cfErr}
      />

      <RelForm
        title="Eliminar arista AMIGO_DE"
        u1={da1} setU1={setDa1} u2={da2} setU2={setDa2}
        onSubmit={handle(() => neo4j.eliminarAmistad(da1.trim(), da2.trim()), setDaOk, setDaErr)}
        btnLabel="Desvincular AMIGO_DE" ok={daOk} err={daErr}
      />

      <RelForm
        title="Eliminar arista FAMILIAR_DE"
        u1={df1} setU1={setDf1} u2={df2} setU2={setDf2}
        onSubmit={handle(() => neo4j.eliminarFamiliar(df1.trim(), df2.trim()), setDfOk, setDfErr)}
        btnLabel="Desvincular FAMILIAR_DE" ok={dfOk} err={dfErr}
      />
    </Panel>
  )
}
