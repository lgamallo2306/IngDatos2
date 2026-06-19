# Vínculo ✶ — frontend unificado

Red social estilo Facebook que consume los cuatro backends del TP. Cada módulo
de la interfaz muestra un badge con el color de la base de datos que lo sirve.

## Cómo correr

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

## Backends esperados

| Base      | Servicio                          | Puerto | Cómo levantarlo                                  |
|-----------|-----------------------------------|--------|--------------------------------------------------|
| MongoDB   | FastAPI (`MongoDB/app`)           | 8000   | `uvicorn app.main:app --port 8000` (desde MongoDB/) |
| Neo4j     | Flask (`Neo4j/app.py`)            | 5000   | `python app.py`                                  |
| Redis     | Flask (`Redis/app.py`)            | 6001   | `python app.py`                                  |
| Cassandra | Javalin (`Cassandra/`)            | 7000   | `mvn exec:java` / correr `Main`                  |



Si algún puerto difiere, crear `frontend/.env.local`:

```
VITE_MONGO_URL=http://localhost:8000
VITE_NEO4J_URL=http://localhost:5000
VITE_REDIS_URL=http://localhost:5001
VITE_CASSANDRA_URL=http://localhost:7000
```

## Qué endpoint usa cada pantalla

**Entrar** (`/login`)
- Mongo `GET /users/search?q=` — buscar tu usuario
- Redis `POST /api/login` — crear la sesión y obtener el token
- Cassandra `POST /cargar` — botón "Cargar dataset"

**Inicio** (`/`)
- Cassandra `GET /feed/{ownerId}` + variantes `/ultimos/{n}`, `/tipo/{postType}`,
  `/rango?desde=&hasta=`, `/feed/autor/{authorId}` — filtros del feed
- Cassandra `POST /feed` y `DELETE /feed/{ownerId}/{createdAt}/{postId}` — publicar / eliminar
- Neo4j `GET /api/feed?username=` — pestaña "Siguiendo"
- Neo4j `GET /api/recomendaciones?username=` + `POST /api/crear_amistad` — "Quizás conozcas a"
- Redis `GET /api/feed` (Bearer) — panel "Validar sesión"
- Mongo `GET /users/{user_id}/stats` — "Mis números"

**Explorar** (`/explorar`)
- Mongo `GET /posts/trending`, `GET /posts/search?q=`, `GET /posts/tag/{tag}`
- Mongo `POST /posts`, `PATCH /posts/{post_id}/like`
- Mongo `GET /users/interest/{interest}`

**Personas** (`/personas`)
- Mongo `GET /users/search?q=`
- Neo4j `GET /api/recomendaciones`, `POST /api/crear_usuario`,
  `POST /api/relaciones`, `POST /api/crear_amistad`, `DELETE /api/usuarios?username=`

**Mensajes** (`/mensajes`)
- Cassandra `GET /mensajes/sender/{senderId}` — lista de conversaciones
- Cassandra `GET /mensajes/{convId}` + `/no-leidos`, `/desde/{ts}`, `/rango?desde=&hasta=`
- Cassandra `POST /mensajes`, `PUT /mensajes/leer`,
  `DELETE /mensajes/{convId}/{sentAt}/{messageId}`

**Perfil** (`/perfil/:username`)
- Mongo `GET /users/{username}`, `GET /users/{user_id}/stats`,
  `GET /posts/user/{user_id}` (paginado), `PUT /users/{user_id}`
- Neo4j `POST /api/crear_amistad` — botón "+ Amigo"

**Post** (`/post/:postId`)
- Mongo `GET /posts/{post_id}`, `PATCH /posts/{post_id}/like`

**Cerrar sesión** — Redis `POST /api/logout`
