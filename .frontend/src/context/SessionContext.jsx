import { createContext, useContext, useState } from 'react'
import { redis } from '../api/redis'

const SessionContext = createContext(null)
const STORAGE_KEY = 'vinculo_session'

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY))
    } catch {
      return null
    }
  })

  // Login: crea la sesión en Redis y guarda token + perfil de Mongo
  const login = async (user) => {
    const res = await redis.login(user.user_id, user.username)
    const next = { token: res.token, user }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
    return next
  }

  const logout = async () => {
    if (session?.token) {
      try { await redis.logout(session.token) } catch { /* la sesión local se cierra igual */ }
    }
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  const validar = () => redis.validarSesion(session?.token)

  return (
    <SessionContext.Provider value={{ session, login, logout, validar }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
