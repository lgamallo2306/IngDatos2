import { Link } from 'react-router-dom'
import Avatar from './Avatar'

export default function UserCard({ user, action, delay = 0 }) {
  return (
    <article className="card user-card reveal" style={{ '--delay': `${delay}ms` }}>
      <Avatar userId={user.user_id} url={user.avatar_url} name={user.display_name || user.username} size={48} />
      <div className="user-card-info">
        <Link to={`/perfil/${user.username}`} className="user-card-name">
          {user.display_name || user.username}
        </Link>
        <span className="user-card-handle mono">@{user.username}</span>
        {user.bio && <p className="user-card-bio">{user.bio}</p>}
        {user.interests?.length > 0 && (
          <div className="tag-row">
            {user.interests.map((i) => <span key={i} className="tag tag-static">{i}</span>)}
          </div>
        )}
      </div>
      {action && <div className="user-card-action">{action}</div>}
    </article>
  )
}
