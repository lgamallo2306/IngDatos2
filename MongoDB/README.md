# Social Network — MongoDB API

Parte MongoDB del TP de Ingeniería de Datos 2.  
Cubre las colecciones `users` y `posts`.

## Estructura

```
social-mongo/
├── data/
│   └── datasetMediano.json     ← copiá el dataset acá
├── scripts/
│   └── import_data.py          ← carga el JSON a Mongo
├── app/
│   ├── main.py                 ← FastAPI app
│   ├── database.py             ← conexión con Motor
│   └── routers/
│       ├── users.py            ← endpoints de usuarios
│       └── posts.py            ← endpoints de posts
├── .env
└── requirements.txt
```

## Setup

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2. Copiar el dataset
```bash
cp /ruta/al/datasetMediano.json data/
```

### 3. Importar datos a MongoDB
Asegurate de tener MongoDB corriendo (Compass ya lo levanta), luego:
```bash
python scripts/import_data.py
```
Verás el resultado en Compass: base `social_network`, colecciones `users` y `posts`.

### 4. Levantar la API
```bash
uvicorn app.main:app --reload
```

La API queda en `http://localhost:8000`  
Documentación interactiva: `http://localhost:8000/docs`

---

## Endpoints

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users/search?q=bautista` | Buscar usuarios por nombre/username/bio |
| GET | `/users/interest/futbol` | Usuarios por interés |
| GET | `/users/luca_gonzalez940` | Perfil por username |
| GET | `/users/{user_id}/stats` | Stats con aggregation pipeline |
| PUT | `/users/{user_id}` | Actualizar perfil |

### Posts
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/posts/search?q=python` | Full-text search en contenido |
| GET | `/posts/tag/gaming` | Posts por tag |
| GET | `/posts/trending` | Posts con más likes |
| GET | `/posts/user/{user_id}` | Posts de un usuario (paginado) |
| GET | `/posts/{post_id}` | Post individual |
| POST | `/posts` | Crear post nuevo |
| PATCH | `/posts/{post_id}/like` | Dar like a un post |

---

## Tags disponibles en el dataset
`argentina`, `cooking`, `python`, `music`, `travel`, `gaming`, `photography`

## Queries de showcase para la demo
1. **Aggregation pipeline** — `GET /users/{user_id}/stats`
2. **Full-text search** — `GET /posts/search?q=python`
3. **Trending con $lookup** — `GET /posts/trending`
4. **Índice multikey** — `GET /posts/tag/gaming`
