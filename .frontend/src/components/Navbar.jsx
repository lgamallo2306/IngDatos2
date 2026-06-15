import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext'
import Avatar from './Avatar'
import DbBadge from './DbBadge'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/explorar', label: 'Explorar' },
  { to: '/personas', label: 'Personas' },
  { to: '/mensajes', label: 'Mensajes' },
]

export default function Navbar() {
  const { session, logout } = useSession()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to={session ? '/' : '/login'} className="logo">
        Vínculo<span className="logo-star">✶</span>
      </Link>

      {session && (
        <>
          <div className="nav-links">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-session">
            <Link to={`/perfil/${session.user.username}`} className="nav-user" title="Mi perfil">
              <Avatar userId={session.user.user_id} url={session.user.avatar_url} name={session.user.display_name || session.user.username} size={30} />
              <span className="nav-username">@{session.user.username}</span>
            </Link>
            <DbBadge db="redis" />
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Salir</button>
          </div>
        </>
      )}
    </nav>
  )
}
