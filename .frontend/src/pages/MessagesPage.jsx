import { useCallback, useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext'
import { cassandra } from '../api/cassandra'
import Panel from '../components/Panel'
import Avatar from '../components/Avatar'
import DbBadge from '../components/DbBadge'
import { Loader, ErrorNote, Empty } from '../components/Feedback'
import { fmtDate, shortId, groupBy } from '../utils/fmt'

export default function MessagesPage() {
  const { session } = useSession()
  const me = session.user

  const [convs, setConvs] = useState(null)
  const [convsError, setConvsError] = useState(null)
  const [convId, setConvId] = useState('')
  const [manualId, setManualId] = useState('')

  // Las conversaciones se derivan de "mensajes enviados por mí" (messages_by_sender)
  useEffect(() => {
    (async () => {
      try {
        const sent = await cassandra.mensajesPorSender(me.user_id)
        const grouped = groupBy(sent, (m) => m.conversationId)
        const list = [...grouped.entries()].map(([id, msgs]) => {
          const last = msgs.reduce((a, b) => (a.sentAt > b.sentAt ? a : b))
          return { conversationId: id, receiverId: last.receiverId, last }
        })
        list.sort((a, b) => (a.last.sentAt < b.last.sentAt ? 1 : -1))
        setConvs(list)
        if (list.length && !convId) setConvId(list[0].conversationId)
      } catch (err) {
        setConvsError(err)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.user_id])

  return (
    <div className="messages-layout">
      <aside className="conv-sidebar">
        <Panel title="Conversaciones" db="cassandra">
          <p className="hint">Derivadas de tus mensajes enviados (tabla messages_by_sender).</p>
          <ErrorNote error={convsError} />
          {convs?.length === 0 && <Empty>No enviaste mensajes aún.</Empty>}
          <ul className="conv-list">
            {convs?.map((c) => (
              <li key={c.conversationId}>
                <button
                  className={`conv-item ${convId === c.conversationId ? 'active' : ''}`}
                  onClick={() => setConvId(c.conversationId)}
                >
                  <Avatar userId={c.receiverId} name={shortId(c.receiverId)} size={34} />
                  <span className="conv-item-info">
                    <strong className="mono">{shortId(c.receiverId)}…</strong>
                    <span className="conv-preview">{c.last.content}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <form
            className="stack-form"
            onSubmit={(e) => { e.preventDefault(); if (manualId.trim()) setConvId(manualId.trim()) }}
          >
            <input className="input input-sm mono" placeholder="…o pegá un conversationId"
              value={manualId} onChange={(e) => setManualId(e.target.value)} />
            <button className="btn btn-sm">Abrir conversación</button>
          </form>
        </Panel>
      </aside>

      <div className="conv-main">
        {convId ? (
          <Conversation key={convId} convId={convId} me={me} />
        ) : (
          <Empty>Elegí una conversación o pegá un ID.</Empty>
        )}
      </div>
    </div>
  )
}

function Conversation({ convId, me }) {
  const [mode, setMode] = useState('todo') // todo | noleidos | desde | rango
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [msgs, setMsgs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [draft, setDraft] = useState('')
  const [receiver, setReceiver] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      let data
      if (mode === 'todo') data = await cassandra.mensajes(convId)
      else if (mode === 'noleidos') data = await cassandra.mensajesNoLeidos(convId)
      else if (mode === 'desde') {
        if (!desde) { setLoading(false); return }
        data = await cassandra.mensajesDesde(convId, new Date(desde).toISOString())
      } else {
        if (!desde || !hasta) { setLoading(false); return }
        data = await cassandra.mensajesRango(convId, new Date(desde).toISOString(), new Date(hasta).toISOString())
      }
      // Cassandra devuelve DESC por clustering: mostramos cronológico
      data = [...data].sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1))
      setMsgs(data)
      const other = data.find((m) => m.senderId !== me.user_id)
      if (other) setReceiver(other.senderId)
      else if (data.length) setReceiver(data[0].receiverId)
    } catch (err) {
      setError(err); setMsgs(null)
    }
    setLoading(false)
  }, [convId, mode, desde, hasta, me.user_id])

  useEffect(() => { load() }, [load])

  const enviar = async (e) => {
    e.preventDefault()
    if (!draft.trim() || !receiver.trim()) return
    setSending(true); setError(null)
    try {
      await cassandra.crearMensaje({
        conversationId: convId,
        senderId: me.user_id,
        receiverId: receiver.trim(),
        content: draft.trim(),
      })
      setDraft('')
      load()
    } catch (err) {
      setError(err)
    }
    setSending(false)
  }

  const marcarLeido = async (m) => {
    try {
      await cassandra.marcarLeido(m.conversationId, m.sentAt, m.messageId)
      setMsgs((prev) => prev.map((x) => (x.messageId === m.messageId ? { ...x, read: true } : x)))
    } catch (err) {
      setError(err)
    }
  }

  const eliminar = async (m) => {
    try {
      await cassandra.eliminarMensaje(m.conversationId, m.sentAt, m.messageId)
      setMsgs((prev) => prev.filter((x) => x.messageId !== m.messageId))
    } catch (err) {
      setError(err)
    }
  }

  return (
    <section className="panel conv-panel">
      <header className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title mono">conv {shortId(convId)}…</h2>
          <DbBadge db="cassandra" />
        </div>
        <div className="filter-bar conv-filters">
          <select className="input input-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="todo">Todos</option>
            <option value="noleidos">No leídos</option>
            <option value="desde">Desde…</option>
            <option value="rango">Rango</option>
          </select>
          {(mode === 'desde' || mode === 'rango') && (
            <input className="input input-sm" type="datetime-local" value={desde} onChange={(e) => setDesde(e.target.value)} />
          )}
          {mode === 'rango' && (
            <input className="input input-sm" type="datetime-local" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          )}
          <button className="btn btn-sm" onClick={load}>⟳</button>
        </div>
      </header>

      <div className="panel-body conv-body">
        {loading && <Loader label="Leyendo la partición…" />}
        <ErrorNote error={error} />
        {msgs?.length === 0 && <Empty>No hay mensajes con este filtro.</Empty>}

        <div className="bubble-list">
          {msgs?.map((m) => {
            const mine = m.senderId === me.user_id
            return (
              <div key={`${m.messageId}-${m.sentAt}`} className={`bubble-row ${mine ? 'mine' : 'theirs'}`}>
                {!mine && <Avatar userId={m.senderId} name={shortId(m.senderId)} size={28} />}
                <div className="bubble">
                  <p>{m.content}</p>
                  {m.mediaUrl && (
                    <a className="mono bubble-media" href={m.mediaUrl} target="_blank" rel="noreferrer">⌗ adjunto</a>
                  )}
                  <span className="bubble-meta mono">
                    {fmtDate(m.sentAt)} · {m.read ? '✓✓ leído' : '○ sin leer'}
                  </span>
                  <span className="bubble-actions">
                    {!m.read && !mine && (
                      <button className="btn btn-ghost btn-xs" onClick={() => marcarLeido(m)}>marcar leído</button>
                    )}
                    <button className="btn btn-ghost btn-xs danger" onClick={() => eliminar(m)}>borrar</button>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <form className="conv-composer" onSubmit={enviar}>
        <input className="input input-sm mono conv-receiver" placeholder="UUID receptor"
          value={receiver} onChange={(e) => setReceiver(e.target.value)} />
        <input className="input conv-draft" placeholder="Escribí un mensaje…"
          value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn btn-primary" disabled={sending || !draft.trim() || !receiver.trim()}>
          {sending ? '…' : 'Enviar ↗'}
        </button>
      </form>
    </section>
  )
}
