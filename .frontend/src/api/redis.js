import { API } from './config'
import { http } from './http'

const base = API.redis

export const redis = {
  login: (userId, username) =>
    http(`${base}/api/login`, { method: 'POST', body: { user_id: userId, username } }),
  validarSesion: (token) => http(`${base}/api/feed`, { token }),
  logout: (token) => http(`${base}/api/logout`, { method: 'POST', token }),
}
