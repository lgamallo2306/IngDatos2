import { API } from './config'
import { http } from './http'

const base = API.neo4j

export const neo4j = {
  recomendaciones: (username) =>
    http(`${base}/api/recomendaciones?username=${encodeURIComponent(username)}`),
  amigos: (username) =>
    http(`${base}/api/amigos/${encodeURIComponent(username)}`),
  familiares: (username) =>
    http(`${base}/api/familiares/${encodeURIComponent(username)}`),
  feedSeguidos: (username) =>
    http(`${base}/api/amigos/${encodeURIComponent(username)}`),
  crearAmistad: (username1, username2) =>
    http(`${base}/api/crear_amistad`, { method: 'POST', body: { username1, username2 } }),
  crearFamiliar: (username1, username2) =>
    http(`${base}/api/crear_familiar`, { method: 'POST', body: { username1, username2 } }),
  eliminarAmistad: (username1, username2) =>
    http(`${base}/api/eliminar_amistad`, { method: 'DELETE', body: { username1, username2 } }),
  eliminarFamiliar: (username1, username2) =>
    http(`${base}/api/eliminar_familiar`, { method: 'DELETE', body: { username1, username2 } }),
}
