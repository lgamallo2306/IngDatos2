# IngDatos2 — Red Social con múltiples motores de base de datos

Proyecto que implementa distintas funcionalidades de una red social usando cuatro motores de base de datos diferentes, cada uno elegido según sus fortalezas.

---

## Motores

| Motor | Framework | Puerto | Caso de uso principal |
|-------|-----------|--------|----------------------|
| MongoDB | FastAPI (Python) | 8000 | Búsqueda de texto y perfiles |
| Neo4j | Flask (Python) | 5000 | Grafo social y recomendaciones |
| Redis | Flask (Python) | 5000 | Gestión de sesiones |
| Cassandra | Javalin (Java) | 7000 | Feed y mensajería en tiempo real |

---

## MongoDB

Gestión de usuarios y publicaciones. Aprovecha búsqueda full-text, índices multikey sobre arrays de tags y aggregation pipelines para estadísticas.

**Estructura:** `MongoDB/app/routers/` (users.py, posts.py)

### Usuarios

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/users/search?q={texto}` | Búsqueda por username, display_name o bio (regex) |
| `GET` | `/users/interest/{interest}` | Usuarios que comparten un interés |
| `GET` | `/users/{username}` | Perfil completo de un usuario |
| `GET` | `/users/{user_id}/stats` | Estadísticas del usuario via aggregation pipeline |
| `PUT` | `/users/{user_id}` | Actualizar campos del perfil |

### Posts

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/posts/search?q={texto}` | Full-text search sobre el contenido |
| `GET` | `/posts/tag/{tag}` | Posts que contienen el tag (índice multikey) |
| `GET` | `/posts/trending` | Posts con más likes (con datos del autor via `$lookup`) |
| `GET` | `/posts/user/{user_id}?page=&limit=` | Posts de un usuario paginados |
| `GET` | `/posts/{post_id}` | Post individual |
| `POST` | `/posts` | Crear un post nuevo |
| `PATCH` | `/posts/{post_id}/like` | Incrementar likes en 1 |

---

## Neo4j

Grafo social de usuarios y sus relaciones de amistad. Permite obtener recomendaciones de nuevos amigos y el feed de publicaciones de los usuarios seguidos.

**Estructura:** `Neo4j/app.py`, `Neo4j/Neo4JService.py`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/recomendaciones?username={u}` | Amigos de amigos recomendados para seguir |
| `GET` | `/api/feed?username={u}` | Publicaciones de los usuarios que sigue |
| `POST` | `/api/crear_usuario` | Crear nodo usuario en el grafo `{username, nombre}` |
| `POST` | `/api/crear_amistad` | Crear relación AMIGO_DE entre dos usuarios `{username1, username2}` |
| `POST` | `/api/eliminar_usuario` | Eliminar nodo y sus relaciones del grafo `{username}` |

---

## Redis

Gestión de sesiones de autenticación con TTL automático. Usa hashes de Redis con expiración configurable (3600 s por defecto).

**Estructura:** `Redis/app.py`, `Redis/redis_repository.py`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/login` | Iniciar sesión — devuelve token Bearer `{user_id}` |
| `GET` | `/api/feed` | Acceder al feed (requiere `Authorization: Bearer {token}`) |
| `POST` | `/api/logout` | Cerrar sesión e invalidar el token |

---

## Cassandra

Feed de usuario y mensajería entre conversaciones. El diseño de claves de partición permite lecturas secuenciales eficientes sin ALLOW FILTERING.

**Estructura:** `Cassandra/src/main/java/` (Main.java, CassandraService.java, DataLoader.java, models/)

**Tablas:**
- `feed_by_user` — PK `(owner_user_id)`, clustering `created_at DESC`
- `feed_by_user_and_type` — PK `(owner_user_id, post_type)`, clustering `created_at DESC`
- `messages_by_conversation` — PK `(conversation_id)`, clustering `sent_at ASC`

### Carga de datos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/cargar` | Carga el dataset `datasetMediano.json` en Cassandra |

### Feed

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/feed/{ownerId}` | Últimas 50 entradas del feed |
| `POST` | `/feed` | Crear entrada `{ownerUserId, postId, authorId, authorUsername, contentPreview, postType, createdAt?}` |
| `DELETE` | `/feed/{ownerId}/{createdAt}/{postId}` | Eliminar una entrada del feed |
| `GET` | `/feed/{ownerId}/rango?desde=&hasta=` | Entradas en un rango de timestamps (ISO 8601) |
| `GET` | `/feed/{ownerId}/ultimos/{n}` | Las N entradas más recientes |
| `GET` | `/feed/{ownerId}/tipo/{postType}` | Entradas filtradas por tipo (tabla secundaria) |

### Mensajes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/mensajes/{conversationId}` | Todos los mensajes de una conversación |
| `POST` | `/mensajes` | Crear mensaje `{conversationId, senderId, receiverId, content, mediaUrl?, sentAt?}` |
| `PUT` | `/mensajes/leer` | Marcar mensaje como leído `{conversationId, sentAt, messageId}` |
| `DELETE` | `/mensajes/{convId}/{sentAt}/{messageId}` | Eliminar un mensaje |
| `GET` | `/mensajes/{conversationId}/rango?desde=&hasta=` | Mensajes en un rango de timestamps |
| `GET` | `/mensajes/{conversationId}/desde/{timestamp}` | Mensajes nuevos desde un timestamp (polling) |
| `GET` | `/mensajes/{conversationId}/no-leidos` | Mensajes no leídos de la conversación |
