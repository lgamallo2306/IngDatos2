import { DB } from '../api/config'

// Etiqueta que indica qué base de datos sirve cada módulo de la UI
export default function DbBadge({ db }) {
  const meta = DB[db]
  if (!meta) return null
  return (
    <span className="db-badge" style={{ '--db': meta.color }} title={`Servido por ${meta.name}`}>
      {meta.name}
    </span>
  )
}
