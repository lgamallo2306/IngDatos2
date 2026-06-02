import { useState } from 'react'
import UsuariosPanel from './components/UsuariosPanel'
import RelacionesPanel from './components/RelacionesPanel'
import FeedPanel from './components/FeedPanel'
import './App.css'

const TABS = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'feed', label: 'Feed & Recomendaciones' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('usuarios')

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <span className="header-logo">◈</span>
          <h1>Red Social</h1>
          <span className="header-subtitle">Panel de Administración — Neo4j</span>
        </div>
        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'usuarios' && <UsuariosPanel />}
        {activeTab === 'relaciones' && <RelacionesPanel />}
        {activeTab === 'feed' && <FeedPanel />}
      </main>
    </div>
  )
}
