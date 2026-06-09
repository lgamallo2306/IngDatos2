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

Feed de usuario y mensajería entre conversaciones. El diseño de claves de partición permite lecturas secuenciales eficientes sin ALLOW FILTERING. Cada escritura se replica en tablas secundarias para soportar distintos patrones de acceso.

**Estructura:** `Cassandra/src/main/java/` (Main.java, CassandraService.java, DataLoader.java, models/)

### Tablas

#### Feed (keyspace `social_network`)

| Tabla | Partition key | Clustering | Uso |
|-------|--------------|------------|-----|
| `feed` | `owner_user_id` | `created_at DESC`, `post_id ASC` | Q1/Q2: feed principal del usuario |
| `feed_by_type` | `owner_user_id` | `post_type ASC`, `created_at DESC`, `post_id ASC` | Q3: filtrar por tipo de publicación |
| `feed_by_author` | `author_id` | `created_at DESC`, `post_id ASC` | Q4: todas las publicaciones de un autor |

#### Mensajes (keyspace `social_network`)

| Tabla | Partition key | Clustering | Uso |
|-------|--------------|------------|-----|
| `messages` | `conversation_id` | `sent_at DESC`, `message_id ASC` | Q5/Q6: mensajes de una conversación |
| `messages_unread` | `conversation_id` | `sent_at DESC`, `message_id ASC` | Q7: no leídos (tabla dedicada, sin ALLOW FILTERING) |
| `messages_by_sender` | `sender_id` | `sent_at DESC`, `message_id ASC` | Q8: todos los mensajes enviados por un usuario |

Cada INSERT en `feed` (Q2) escribe automáticamente en `feed_by_type` (Q3) y `feed_by_author` (Q4).  
Cada INSERT en `messages` (Q6) escribe automáticamente en `messages_unread` (Q7, solo si no leído) y `messages_by_sender` (Q8).  
Al marcar un mensaje como leído se elimina de `messages_unread`.



### Carga de datos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/cargar` | Carga el dataset `datasetMediano.json` en Cassandra |

### Feed

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/feed/{ownerId}` | Q1: últimas 50 entradas del feed |
| `POST` | `/feed` | Q2: crear entrada `{ownerUserId, postId, authorId, authorUsername, contentPreview, postType, createdAt?}` — escribe en las 3 tablas |
| `DELETE` | `/feed/{ownerId}/{createdAt}/{postId}` | Eliminar una entrada del feed |
| `GET` | `/feed/{ownerId}/rango?desde=&hasta=` | Entradas en un rango de timestamps (ISO 8601) |
| `GET` | `/feed/{ownerId}/ultimos/{n}` | Las N entradas más recientes |
| `GET` | `/feed/{ownerId}/tipo/{postType}` | Q3: entradas filtradas por tipo (`feed_by_type`) |
| `GET` | `/feed/autor/{authorId}` | Q4: todas las publicaciones de un autor (`feed_by_author`) |

### Mensajes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/mensajes/{conversationId}` | Q5: todos los mensajes de una conversación |
| `POST` | `/mensajes` | Q6: crear mensaje `{conversationId, senderId, receiverId, content, mediaUrl?, sentAt?}` — escribe en las 3 tablas |
| `PUT` | `/mensajes/leer` | Marcar mensaje como leído `{conversationId, sentAt, messageId}` — elimina de `messages_unread` |
| `DELETE` | `/mensajes/{convId}/{sentAt}/{messageId}` | Eliminar un mensaje de `messages` y `messages_unread` |
| `GET` | `/mensajes/{conversationId}/rango?desde=&hasta=` | Mensajes en un rango de timestamps |
| `GET` | `/mensajes/{conversationId}/desde/{timestamp}` | Mensajes nuevos desde un timestamp (polling) |
| `GET` | `/mensajes/{conversationId}/no-leidos` | Q7: mensajes no leídos (`messages_unread`, sin ALLOW FILTERING) |
| `GET` | `/mensajes/sender/{senderId}` | Q8: todos los mensajes enviados por un usuario (`messages_by_sender`) |
