# IngDatos2 — Plataforma de Red Social con Múltiples Bases de Datos

Proyecto académico que implementa una red social distribuida usando cuatro tecnologías de bases de datos distintas, cada una elegida según su patrón de acceso óptimo.

## Arquitectura general

```
IngDatos2/
├── Cassandra/      # Feed y mensajes (Java 17 + Javalin, puerto 7000)
├── Neo4j/          # Relaciones y recomendaciones (Python + Flask, puerto 5000)
├── Redis/          # Gestión de sesiones (Python)
├── lib/            # JARs de dependencias Java
├── dataset.json            # Dataset de prueba pequeño
└── datasetMediano.json     # Dataset mediano (100 usuarios, 350 mensajes)
```

## Componentes

### Cassandra (Java)
- **Propósito**: almacenamiento de feeds y mensajes optimizado para series temporales
- **Build**: Maven (`mvn clean package` genera fat JAR en `target/`)
- **Entry point**: `Cassandra/src/main/java/Main.java` — servidor REST Javalin en `:7000`
- **Dependencias clave**: Javalin 6.1.3, DataStax Java Driver 4.17.0, Jackson 2.17.0
- **Prerequisito**: Cassandra corriendo en `localhost:9042`

**Endpoints principales:**
| Ruta | Descripción |
|------|-------------|
| `GET /feed/{ownerId}` | Feed completo del usuario |
| `GET /feed/{ownerId}/rango` | Feed por rango de fechas |
| `GET /feed/{ownerId}/pagina` | Feed paginado |
| `GET /feed/{ownerId}/ultimos/{n}` | Últimos N posts |
| `GET /feed/{ownerId}/tipo/{postType}` | Feed filtrado por tipo |
| `GET /mensajes/{conversationId}` | Mensajes de conversación |
| `GET /mensajes/{conversationId}/no-leidos` | Mensajes no leídos |
| `POST /cargar` | Carga masiva desde JSON |

**Schema (keyspace `social_network`):**
- `feed_by_user` — partición por usuario, clustering por `timestamp DESC`
- `feed_by_user_and_type` — partición por `(usuario, tipo)` para filtros
- `messages_by_conversation` — partición por conversación, clustering por `timestamp ASC`

### Neo4j (Python)
- **Propósito**: relaciones entre usuarios, recomendaciones de amigos (amigo-de-amigo)
- **Entry point**: `Neo4j/app.py` — Flask en `:5000`; `Neo4j/main.py` para carga masiva
- **Conexión**: `bolt://localhost:7687`, credenciales `neo4j / Independiente2026`
- **Prerequisito**: Neo4j corriendo en `localhost:7687`

**Endpoints Flask:**
| Ruta | Descripción |
|------|-------------|
| `GET /api/recomendaciones?username=X` | Recomendaciones de amigos |
| `GET /api/feed?username=X` | Feed del usuario |
| `POST /api/usuarios` | Crear usuario |
| `POST /api/relaciones` | Crear amistad |
| `DELETE /api/usuarios?username=X` | Eliminar usuario |

### Redis (Python)
- **Propósito**: gestión de sesiones con TTL
- **Entry point**: `Redis/main.py` — script de demostración
- **Conexión**: `localhost:6379`
- **Prerequisito**: Redis corriendo en `localhost:6379`

**Almacenamiento**: claves `auth:session:{token}` (hash con `user_id`, `device`), TTL de 3600 s

## Cómo ejecutar cada servicio

```bash
# Cassandra
cd Cassandra
mvn clean package
java -cp target/IngDatos2-1.0-SNAPSHOT-jar-with-dependencies.jar Main

# Neo4j — Flask app
cd Neo4j
python app.py

# Neo4j — carga masiva
cd Neo4j
python main.py

# Redis — demo de sesiones
cd Redis
python main.py
```

## Dataset compartido

`datasetMediano.json` contiene 100 usuarios con campos `user_id`, `username`, `display_name`, `email`, `bio`, `interests`, `settings` y `session`. Se usa como fuente unificada para cargar datos en todos los motores.

## Patrones de diseño usados

- **Cassandra**: "una tabla por consulta", prepared statements, singleton de conexión
- **Neo4j**: UNWIND para carga masiva, consultas de grafos bidireccionales, capa de servicio en `Neo4JService.py`
- **Redis**: hash por sesión, TTL automático, clase `SessionRepository`

## Repositorio

Remote: `https://github.com/lgamallo2306/IngDatos2`

---

## Consigna académica — Trabajo Práctico Integrador

**Asignatura**: Ingeniería de Datos II  
**Profesora**: Dra. Ing. Roxana Martínez

### Objetivo

Diseñar y desarrollar un proyecto integral que permita aplicar, de manera práctica, los conocimientos adquiridos en la asignatura. Integrar herramientas, lenguajes y tecnologías de bases de datos NoSQL en el contexto de una solución a un problema real o una oportunidad de negocio.

### Consigna general

Proponer y desarrollar un proyecto original basado en una idea de negocio, en el cual se evidencie el uso de tecnologías de almacenamiento y procesamiento de datos.

**Tecnologías obligatorias:**
- Lenguaje de programación a elección (preferentemente Python; también Java u otro)
- **Neo4j** — base de datos orientada a grafos
- **MongoDB** — base de datos NoSQL orientada a documentos
- **Apache Cassandra** — base de datos NoSQL orientada a columnas (alta escalabilidad, grandes volúmenes)
- **Redis** — base de datos en memoria (caché, optimización de tiempos, datos en tiempo real)

> Se evalúan habilidades de **BASES DE DATOS**, no de programación. No está permitido utilizar software de otra asignatura.

### Requisitos específicos

1. Presentar una idea de negocio clara, fundamentada y viable (debe ser aprobada por la docente).
2. Justificar el uso de cada tipo de base de datos en función del problema planteado.
3. Demostrar la correcta implementación de:
   - Modelado de datos en MongoDB
   - Modelado de grafos en Neo4j
   - Modelado en Redis
   - Modelado en Cassandra
4. Incluir operaciones básicas y avanzadas (consultas, inserciones, actualizaciones, relaciones, etc.).
5. Evidenciar la interacción entre la aplicación y ambas bases de datos, destacando las bases de datos.
6. Mostrar buenas prácticas de base de datos (claridad, documentación básica, etc.).

### Entregables

- Documento descriptivo del proyecto (portada, idea de negocio, justificación tecnológica, arquitectura propuesta, etc.)
- Código fuente inicial + bases de datos
- Evidencia de conexión e interacción con ambas bases de datos
- Ejemplos de consultas y operaciones realizadas

### Criterios de evaluación

- Originalidad y claridad de la propuesta
- Correcta aplicación de conceptos teóricos
- Uso adecuado de las tecnologías requeridas
- Calidad técnica de la implementación
- Coherencia entre la solución planteada y la necesidad de negocio
