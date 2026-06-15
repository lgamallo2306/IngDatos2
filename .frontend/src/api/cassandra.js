import { API } from './config'
import { http } from './http'

const base = API.cassandra
const enc = encodeURIComponent

export const cassandra = {
  cargarDataset: () => http(`${base}/cargar`, { method: 'POST' }),

  // ---- feed ----
  feed: (ownerId) => http(`${base}/feed/${enc(ownerId)}`),
  feedUltimos: (ownerId, n) => http(`${base}/feed/${enc(ownerId)}/ultimos/${n}`),
  feedPorTipo: (ownerId, tipo) => http(`${base}/feed/${enc(ownerId)}/tipo/${enc(tipo)}`),
  feedRango: (ownerId, desde, hasta) =>
    http(`${base}/feed/${enc(ownerId)}/rango?desde=${enc(desde)}&hasta=${enc(hasta)}`),
  feedPorAutor: (authorId) => http(`${base}/feed/autor/${enc(authorId)}`),
  crearFeed: (body) => http(`${base}/feed`, { method: 'POST', body }),
  eliminarFeed: (ownerId, createdAt, postId) =>
    http(`${base}/feed/${enc(ownerId)}/${enc(createdAt)}/${enc(postId)}`, { method: 'DELETE' }),

  // ---- mensajes ----
  mensajes: (convId) => http(`${base}/mensajes/${enc(convId)}`),
  mensajesRango: (convId, desde, hasta) =>
    http(`${base}/mensajes/${enc(convId)}/rango?desde=${enc(desde)}&hasta=${enc(hasta)}`),
  mensajesDesde: (convId, timestamp) =>
    http(`${base}/mensajes/${enc(convId)}/desde/${enc(timestamp)}`),
  mensajesNoLeidos: (convId) => http(`${base}/mensajes/${enc(convId)}/no-leidos`),
  mensajesPorSender: (senderId) => http(`${base}/mensajes/sender/${enc(senderId)}`),
  crearMensaje: (body) => http(`${base}/mensajes`, { method: 'POST', body }),
  marcarLeido: (conversationId, sentAt, messageId) =>
    http(`${base}/mensajes/leer`, { method: 'PUT', body: { conversationId, sentAt, messageId } }),
  eliminarMensaje: (convId, sentAt, messageId) =>
    http(`${base}/mensajes/${enc(convId)}/${enc(sentAt)}/${enc(messageId)}`, { method: 'DELETE' }),
}
