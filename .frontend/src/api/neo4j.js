import { API } from './config'
import { http } from './http'

const base = API.neo4j

export const neo4j = {
  recomendaciones: (username) =>
    http(`${base}/api/recomendaciones?username=${encodeURIComponent(username)}`),
  amigos: (username) =>
    http(`${base}/api/amigos/${encodeURIComponent(username)}`),
  feedSeguidos: (username) =>
    http(`${base}/api/amigos/${encodeURIComponent(username)}`),
  crearAmistad: (username1, username2) =>
    http(`${base}/api/crear_amistad`, { method: 'POST', body: { username1, username2 } }),
  crearRelacion: (username1, username2) =>
    http(`${base}/api/crear_amistad`, { method: 'POST', body: { username1, username2 } }),
}
