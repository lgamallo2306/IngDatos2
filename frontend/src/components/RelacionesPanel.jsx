import { useState } from 'react'

const API = 'http://localhost:5000'

function Alert({ type, message, onClose }) {
  if (!message) return null
  return (
    <div className={`alert alert-${type}`}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>×</button>
    </div>
  )
}

export default function RelacionesPanel() {
  const [username1, setUsername1] = useState('')
  const [username2, setUsername2] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (username1.trim() === username2.trim()) {
      setStatus({ type: 'error', msg: 'Los dos usuarios no pueden ser el mismo.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${API}/api/relaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username1: username1.trim(), username2: username2.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      setStatus({ type: 'success', msg: data.mensaje })
      setUsername1('')
      setUsername2('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="panel">
      <div>
        <h2 className="panel-title">Gestión de Relaciones</h2>
        <p className="panel-description">Crea vínculos de amistad o seguimiento entre dos nodos del grafo.</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title">
          <span className="card-icon">↔</span>
          Conectar dos usuarios
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="rel-user1">Usuario 1 (origen)</label>
            <input
              id="rel-user1"
              type="text"
              placeholder="ej: maria_94"
              value={username1}
              onChange={e => setUsername1(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 22 }}>
            ↓
          </div>

          <div className="field">
            <label htmlFor="rel-user2">Usuario 2 (destino)</label>
            <input
              id="rel-user2"
              type="text"
              placeholder="ej: luca_94"
              value={username2}
              onChange={e => setUsername2(e.target.value)}
              required
            />
          </div>

          {status && (
            <Alert
              type={status.type}
              message={status.msg}
              onClose={() => setStatus(null)}
            />
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            {loading ? 'Conectando...' : 'Crear vínculo de amistad'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 560, background: 'rgba(99,102,241,0.05)', border: '1px dashed #2d3148' }}>
        <div className="card-title" style={{ marginBottom: 8 }}>
          <span className="card-icon">ℹ</span>
          Sobre las relaciones en Neo4j
        </div>
        <p style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>
          Esta operación crea una arista <code style={{ background: '#0f1117', padding: '1px 6px', borderRadius: 4, color: '#a5b4fc', fontSize: 12 }}>AMIGO_DE</code> entre
          los dos nodos en el grafo. El algoritmo de recomendaciones usa estas conexiones
          para sugerir amigos en común a cada usuario.
        </p>
      </div>
    </div>
  )
}
