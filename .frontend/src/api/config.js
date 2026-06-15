// URLs de los cuatro backends. Se pueden sobreescribir con variables
// VITE_*_URL en un archivo .env.local si los puertos cambian.
export const API = {
  mongo: import.meta.env.VITE_MONGO_URL || 'http://localhost:8000',
  neo4j: import.meta.env.VITE_NEO4J_URL || 'http://localhost:5000',
  redis: import.meta.env.VITE_REDIS_URL || '/redis',
  cassandra: import.meta.env.VITE_CASSANDRA_URL || 'http://localhost:5002',
}

export const DB = {
  mongo: { name: 'MongoDB', color: '#0E9F5B' },
  cassandra: { name: 'Cassandra', color: '#1287B1' },
  neo4j: { name: 'Neo4j', color: '#0167C2' },
  redis: { name: 'Redis', color: '#D82C20' },
}
