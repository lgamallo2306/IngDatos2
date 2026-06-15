import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mongo } from '../api/mongo'
import { fmtDate, shortId } from '../utils/fmt'
import Avatar from './Avatar'
import DbBadge from './DbBadge'

// Post de MongoDB. `author` viene embebido solo en /posts/trending.
export default function PostCard({ post, onTagClick, delay = 0 }) {
  const [likes, setLikes] = useState(post.likes_count ?? 0)
  const [liking, setLiking] = useState(false)
  const [popped, setPopped] = useState(false)

  const author = post.author

  const like = async () => {
    if (liking) return
    setLiking(true)
    try {
      const res = await mongo.likePost(post.post_id)
      setLikes(res.likes_count)
      setPopped(true)
      setTimeout(() => setPopped(false), 400)
    } catch { /* el contador queda como estaba */ }
    setLiking(false)
  }

  return (
    <article className="card post-card reveal" style={{ '--delay': `${delay}ms` }}>
      <header className="post-head">
        <Avatar
          userId={post.user_id}
          url={author?.avatar_url}
          name={author?.display_name || author?.username || shortId(post.user_id)}
          size={42}
        />
        <div className="post-who">
          {author?.username ? (
            <Link to={`/perfil/${author.username}`} className="post-author">
              {author.display_name || author.username}
            </Link>
          ) : (
            <span className="post-author mono">{shortId(post.user_id)}…</span>
          )}
          <span className="post-meta">
            {fmtDate(post.created_at)} · {post.visibility || 'public'}
          </span>
        </div>
        <DbBadge db="mongo" />
      </header>

      <p className="post-content">{post.content}</p>

      {post.media_urls?.length > 0 && (
        <div className="post-media mono">
          {post.media_urls.map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer">⌗ {u}</a>
          ))}
        </div>
      )}

      {post.tags?.length > 0 && (
        <div className="tag-row">
          {post.tags.map((t) => (
            <button key={t} className="tag" onClick={() => onTagClick?.(t)}>#{t}</button>
          ))}
        </div>
      )}

      <footer className="post-foot">
        <button className={`like-btn ${popped ? 'pop' : ''}`} onClick={like} disabled={liking}>
          ♥ {likes}
        </button>
        <span className="post-comments">✎ {post.comments_count ?? 0} comentarios</span>
        <Link to={`/post/${post.post_id}`} className="post-permalink mono">ver post →</Link>
      </footer>
    </article>
  )
}
