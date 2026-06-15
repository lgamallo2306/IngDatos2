import { API } from './config'
import { http } from './http'

const base = API.neo4j

export const neo4j = {
  recomendaciones: (username) =>
    http(`${base}/api/recomendaciones?username=${encodeURIComponent(username)}`),
  feedSeguidos: (username) =>
    http(`${base}/api/feed?username=${encodeURIComponent(username)}`),
  crearUsuario: (username, nombre) =>
    http(`${base}/api/crear_usuario`, { method: 'POST', body: { username, nombre } }),
  crearAmistad: (username1, username2) =>
    http(`${base}/api/crear_amistad`, { method: 'POST', body: { username1, username2 } }),
  crearRelacion: (username1, username2) =>
    http(`${base}/api/relaciones`, { method: 'POST', body: { username1, username2 } }),
  eliminarUsuario: (username) =>
    http(`${base}/api/usuarios?username=${encodeURIComponent(username)}`, { method: 'DELETE' }),
  eliminarUsuarioPost: (username) =>
    http(`${base}/api/eliminar_usuario`, { method: 'POST', body: { username } }),
}
