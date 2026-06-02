import { useState } from 'react'

const API = 'http://localhost:5000'

function useFormState(initial) {
  const [values, setValues] = useState(initial)
  const set = (field) => (e) => setValues(v => ({ ...v, [field]: e.target.value }))
  const reset = () => setValues(initial)
  return [values, set, reset]
}

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

function CrearUsuario() {
  const [form, set, reset] = useFormState({ username: '', nombre: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${API}/api/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      setStatus({ type: 'success', msg: data.mensaje })
      reset()
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">＋</span>
        Registrar nuevo usuario
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cr-username">Username</label>
          <input
            id="cr-username"
            type="text"
            placeholder="ej: maria_94"
            value={form.username}
            onChange={set('username')}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="cr-nombre">Nombre completo</label>
          <input
            id="cr-nombre"
            type="text"
            placeholder="ej: María García"
            value={form.nombre}
            onChange={set('nombre')}
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
          {loading ? 'Creando...' : 'Crear usuario'}
        </button>
      </form>
    </div>
  )
}

function EliminarUsuario() {
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${API}/api/usuarios?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      setStatus({ type: 'success', msg: data.mensaje })
      setUsername('')
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-title">
        <span className="card-icon">✕</span>
        Eliminar usuario del grafo
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="del-username">Username a eliminar</label>
          <input
            id="del-username"
            type="text"
            placeholder="ej: luca_94"
            value={username}
            onChange={e => setUsername(e.target.value)}
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
        <button type="submit" className="btn btn-danger" disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? 'Eliminando...' : 'Eliminar usuario'}
        </button>
      </form>
    </div>
  )
}

export default function UsuariosPanel() {
  return (
    <div className="panel">
      <div>
        <h2 className="panel-title">Gestión de Usuarios</h2>
        <p className="panel-description">Administra los nodos de usuario en el grafo de Neo4j.</p>
      </div>
      <div className="two-col">
        <CrearUsuario />
        <EliminarUsuario />
      </div>
    </div>
  )
}
