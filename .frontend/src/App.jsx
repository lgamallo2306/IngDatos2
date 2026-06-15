import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import PeoplePage from './pages/PeoplePage'
import MessagesPage from './pages/MessagesPage'
import ProfilePage from './pages/ProfilePage'
import PostDetailPage from './pages/PostDetailPage'

function RequireSession({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireSession><FeedPage /></RequireSession>} />
          <Route path="/explorar" element={<RequireSession><ExplorePage /></RequireSession>} />
          <Route path="/personas" element={<RequireSession><PeoplePage /></RequireSession>} />
          <Route path="/mensajes" element={<RequireSession><MessagesPage /></RequireSession>} />
          <Route path="/perfil/:username" element={<RequireSession><ProfilePage /></RequireSession>} />
          <Route path="/post/:postId" element={<RequireSession><PostDetailPage /></RequireSession>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer mono">
        Vínculo ✶ TP Ingeniería de Datos 2 — MongoDB · Cassandra · Neo4j · Redis
      </footer>
    </div>
  )
}
