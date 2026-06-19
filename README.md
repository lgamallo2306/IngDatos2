# IngDatos2 — Red Social Distribuida

Proyecto de Ingeniería de Datos 2. Backend de una red social implementado con cuatro motores de base de datos distintos, cada uno resolviendo un caso de uso diferente.

---

## Motores y puertos

| Motor | Puerto DB | Puerto API | Framework |
|---|---|---|---|
| Redis | 6379 | **5001** | Flask |
| Neo4j | 7687 (Bolt) · 7474 (HTTP) | **5000** | Flask |
| Cassandra | 9042 | **5002** | Flask |
| MongoDB | 27017 | **8000** | FastAPI |

---

## Cómo ejecutar cada motor

El proyecto incluye un `docker-compose.yml` con perfiles para levantar cada motor de forma independiente.

```bash
# Levantar un motor específico
docker compose --profile redis up -d
docker compose --profile neo4j up -d
docker compose --profile cassandra up -d
docker compose --profile mongo up -d

# Levantar todos a la vez
docker compose --profile all up -d
```

---

### Redis

```bash
docker compose --profile redis up -d

pip install -r requirements.txt
python Redis/app.py
# → http://localhost:5001

# Cargar dataset (opcional)
python Redis/seed.py
```

---

### Neo4j

> La contraseña configurada en `docker-compose.yml` es `passwordsecreta`. El archivo `Neo4j/app.py` usa `Independiente2026` — asegurarse de que coincidan antes de arrancar.

```bash
docker compose --profile neo4j up -d

pip install -r requirements.txt
python Neo4j/app.py
# → http://localhost:5000

# Cargar dataset (opcional)
python Neo4j/cargar_dataset.py
```

---

### Cassandra

```bash
docker compose --profile cassandra up -d
# Esperar ~30 segundos hasta que el nodo esté listo

pip install -r requirements.txt
python Cassandra/app.py
# → http://localhost:5002

# Cargar dataset desde la API o por script
curl -X POST http://localhost:5002/cargar
# o bien:
python Cassandra/cargar_dataset.py
```

---

### MongoDB

```bash
docker compose --profile mongo up -d

pip install -r MongoDB/requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# Documentación interactiva: http://localhost:8000/docs

# Cargar dataset (opcional)
python MongoDB/scripts/import_data.py
```

---

## Endpoints

### Redis — Sesiones y seguridad (`http://localhost:5001`)

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| POST | `/api/login` | Crear sesión y obtener token | `{ user_id, username }` |
| GET | `/api/feed` | Validar token y acceder al feed | Header: `Authorization: Bearer <token>` |
| POST | `/api/logout` | Cerrar sesión | Header: `Authorization: Bearer <token>` |
| GET | `/api/admin/online` | Usuarios activos en los últimos 5 minutos | — |
| POST | `/api/admin/ban` | Banear una IP por 24 horas | `{ ip_address }` |
| POST | `/api/admin/unban` | Desbanear una IP | `{ ip_address }` |

---

### Neo4j — Grafo social (`http://localhost:5000`)

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| GET | `/api/recomendaciones` | Amigos sugeridos (amigos de amigos, ordenados por amigos en común) | `?username=X` |
| POST | `/api/crear_amistad` | Crear relación `AMIGO_DE` | `{ username1, username2 }` |
| POST | `/api/crear_familiar` | Crear relación `FAMILIAR_DE` | `{ username1, username2 }` |
| DELETE | `/api/eliminar_amistad` | Eliminar relación de amistad | `{ username1, username2 }` |
| DELETE | `/api/eliminar_familiar` | Eliminar relación familiar | `{ username1, username2 }` |
| GET | `/api/obtener_amigos_comun` | Amigos en común entre dos usuarios | `?username1=X&username2=Y` |
| PUT | `/api/actualizar_usuario` | Actualizar el nombre (`nombre`) de un usuario | `{ username, nuevo_nombre }` |

---

### Cassandra — Feed y mensajes (`http://localhost:5002`)

#### Carga de datos

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/cargar` | Importar `datasetMediano.json` en Cassandra |

#### Feed

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| GET | `/feed/<ownerId>` | Últimas 50 entradas del feed de un usuario | — |
| POST | `/feed` | Crear entrada de feed | `{ ownerUserId, postId, authorId, authorUsername, contentPreview, postType }` |
| DELETE | `/feed/<ownerId>/<createdAt>/<postId>` | Eliminar entrada de feed | — |
| GET | `/feed/<ownerId>/ultimos/<n>` | Top N entradas más recientes | — |
| GET | `/feed/<ownerId>/rango` | Entradas en un rango de fechas | `?desde=ISO&hasta=ISO` |
| GET | `/feed/<ownerId>/tipo/<postType>` | Entradas filtradas por tipo (`text`, `image`, `video`, `link`) | — |
| GET | `/feed/autor/<authorId>` | Todas las entradas publicadas por un autor | — |

#### Mensajes

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| GET | `/mensajes/<convId>` | Todos los mensajes de una conversación | — |
| POST | `/mensajes` | Enviar mensaje | `{ conversationId, senderId, receiverId, content, mediaUrl? }` |
| PUT | `/mensajes/leer` | Marcar mensaje como leído | `{ conversationId, sentAt, messageId }` |
| DELETE | `/mensajes/<convId>/<sentAt>/<messageId>` | Eliminar mensaje | — |
| GET | `/mensajes/<convId>/rango` | Mensajes en un rango de fechas | `?desde=ISO&hasta=ISO` |
| GET | `/mensajes/<convId>/desde/<timestamp>` | Mensajes a partir de una fecha | — |
| GET | `/mensajes/<convId>/no-leidos` | Mensajes no leídos de una conversación | — |
| GET | `/mensajes/sender/<senderId>` | Todos los mensajes enviados por un usuario | — |

---

### MongoDB — Usuarios y posts (`http://localhost:8000`)

Documentación interactiva disponible en `http://localhost:8000/docs`.

#### Usuarios

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| GET | `/users/search` | Buscar usuarios por username, display_name o bio | `?q=texto` |
| GET | `/users/interest/<interest>` | Usuarios que comparten un interés | — |
| GET | `/users/<username>` | Perfil completo de un usuario | — |
| GET | `/users/<user_id>/stats` | Estadísticas de publicaciones del usuario | — |
| POST | `/users/` | Crear usuario | `{ username, display_name, ... }` |
| PUT | `/users/<user_id>` | Actualizar perfil | `{ bio?, location?, website?, display_name?, settings?, interests?, avatar_url? }` |
| DELETE | `/users/<user_id>` | Eliminar usuario | — |

#### Posts

| Método | Endpoint | Descripción | Body / Params |
|---|---|---|---|
| GET | `/posts/search` | Búsqueda full-text en el contenido | `?q=texto` |
| GET | `/posts/tag/<tag>` | Posts que contienen un tag | `?limit=20` |
| GET | `/posts/trending` | Posts públicos con más likes | `?limit=10` |
| GET | `/posts/user/<user_id>` | Posts de un usuario, paginados | `?page=1&limit=10` |
| GET | `/posts/<post_id>` | Post individual | — |
| POST | `/posts/` | Crear post | `{ user_id, content, tags?, media_urls?, visibility? }` |
| PATCH | `/posts/<post_id>/like` | Incrementar likes en 1 | — |

---

## Dataset

El archivo `datasetMediano.json` en la raíz contiene:

| Colección | Cantidad |
|---|---|
| Usuarios | 100 |
| Posts | 250 |
| Mensajes | 350 |
| Entradas de feed | 300 |
| Relaciones (follows, blocks, etc.) | 650 |

Cada motor importa únicamente los datos relevantes para su caso de uso.
