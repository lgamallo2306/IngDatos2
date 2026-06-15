import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { mongo } from '../api/mongo'
import PostCard from '../components/PostCard'
import { Loader, ErrorNote } from '../components/Feedback'

export default function PostDetailPage() {
  const { postId } = useParams()
  const [post, setPost] = useState(null)
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null)
      try {
        const p = await mongo.getPost(postId)
        setPost(p)
        // /users/:id/stats resuelve username y display_name a partir del user_id
        try {
          const s = await mongo.getUserStats(p.user_id)
          setAuthor({ username: s.username, display_name: s.display_name })
        } catch { /* el post se muestra igual sin autor */ }
      } catch (err) {
        setError(err)
      }
      setLoading(false)
    })()
  }, [postId])

  return (
    <div className="post-detail">
      <Link to="/explorar" className="mono post-permalink">← volver a explorar</Link>
      <h1 className="page-title">Publicación</h1>
      {loading && <Loader label="Buscando el documento…" />}
      <ErrorNote error={error} />
      {post && <PostCard post={{ ...post, author }} />}
    </div>
  )
}
