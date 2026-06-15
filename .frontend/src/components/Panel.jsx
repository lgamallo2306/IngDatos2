import DbBadge from './DbBadge'

// Tarjeta-sección con título y badge de la base que la alimenta
export default function Panel({ title, db, actions, children, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {(title || db || actions) && (
        <header className="panel-head">
          <div className="panel-title-row">
            {title && <h2 className="panel-title">{title}</h2>}
            {db && <DbBadge db={db} />}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  )
}
