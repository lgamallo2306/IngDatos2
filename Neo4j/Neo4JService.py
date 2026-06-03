from neo4j import GraphDatabase
import json

class Neo4jService:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    # OPERACIONES BÁSICAS

    def crear_usuario(self, username, nombre):
        query = """
        CREATE (u:Usuario {username: $username, nombre: $nombre})
        RETURN u.username AS username, u.nombre AS nombre
        """
        with self.driver.session() as session:
            result = session.run(query, username=username, nombre=nombre)
            return result.single().data()

    def crear_relacion_amigo(self, username1, username2):
        query = """
        MATCH (a:Usuario {username: $username1})
        MATCH (b:Usuario {username: $username2})
        MERGE (a)-[r:AMIGO_DE]->(b)
        RETURN type(r) AS relacion
        """
        with self.driver.session() as session:
            result = session.run(query, username1=username1, username2=username2)
            return result.data()

    def eliminar_usuario(self, username):
        query = """
        MATCH (u:Usuario {username: $username})
        DETACH DELETE u
        """
        with self.driver.session() as session:
            session.run(query, username=username)
            return f"Usuario {username} eliminado con éxito."

    def obtener_recomendaciones(self, username):
        """
        Algoritmo "Quizás conozcas a".
        Busca amigos de mis amigos que NO sean mis amigos actualmente.
        """
        query = """
        MATCH (usuario:Usuario {username: $username})-[:AMIGO_DE]-(amigo)-[:AMIGO_DE]-(posible_amigo:Usuario)
        WHERE NOT (usuario)-[:AMIGO_DE]-(posible_amigo) AND usuario <> posible_amigo
        RETURN posible_amigo.username AS recomendado,
               posible_amigo.nombre AS nombre,
               count(amigo) AS amigos_en_comun
        ORDER BY amigos_en_comun DESC
        LIMIT 5
        """
        with self.driver.session() as session:
            result = session.run(query, username=username)
            return [record.data() for record in result]

    def cargar_datos_desde_json(self, ruta_archivo):
        """
        Lee el archivo JSON de Mockaroo e inyecta los datos respetando las claves con guion bajo.
        """
        try:
            with open(ruta_archivo, 'r', encoding='utf-8') as archivo:
                datos = json.load(archivo)
        except FileNotFoundError:
            print(f"❌ Error: No se encontró el archivo en la ruta: {ruta_archivo}")
            return
        except json.JSONDecodeError:
            print("❌ Error: El archivo no tiene un formato JSON válido.")
            return

        print(f"⏳ Procesando e inyectando {len(datos)} registros en Neo4j...")

        query = """
        UNWIND $lista_datos AS fila
        MERGE (u:Usuario {username: fila.user_name})
        ON CREATE SET u.nombre = fila.first_name,
                      u.apellido = fila.last_name,
                      u.id_original = fila.id
        """
        with self.driver.session() as session:
            try:
                session.run(query, lista_datos=datos)
                print("✅ ¡Inyección masiva completada con éxito en el grafo!")
            except Exception as e:
                print(f"❌ Ocurrió un error al interactuar con Neo4j: {e}")

    # CARGA MASIVA DESDE datasetMediano.json (formato con user_id/relationships)

    def cargar_usuarios_desde_dataset(self, ruta_archivo):
        """
        Carga los nodos Usuario desde datasetMediano.json.
        Guarda user_id (UUID) además de username/nombre para que después
        las relaciones puedan matchear por user_id.
        """
        with open(ruta_archivo, 'r', encoding='utf-8') as archivo:
            datos = json.load(archivo)

        usuarios = datos.get("users", [])
        print(f"⏳ Cargando {len(usuarios)} usuarios en el grafo...")

        query = """
        UNWIND $usuarios AS u
        MERGE (n:Usuario {user_id: u.user_id})
        SET n.username = u.username,
            n.nombre   = u.display_name
        """
        with self.driver.session() as session:
            session.run(query, usuarios=usuarios)
        print(f"✅ {len(usuarios)} usuarios cargados.")
        return len(usuarios)

    def cargar_relaciones_desde_dataset(self, ruta_archivo):
        """
        Carga las relaciones desde datasetMediano.json (array 'relationships',
        con type FOLLOWS/BLOCKS y from_user/to_user como user_id).

        Crea dos capas:
          - INTERACTUA_CON {tipo}: una arista direccional por cada relación
            (alimenta el feed vía obtener_lista_seguidos y sugerir_amigos).
          - AMIGO_DE: cuando dos usuarios se siguen mutuamente (follow recíproco),
            que es la semántica que consume obtener_recomendaciones.

        Requiere que los usuarios ya estén cargados (cargar_usuarios_desde_dataset).
        """
        with open(ruta_archivo, 'r', encoding='utf-8') as archivo:
            datos = json.load(archivo)

        relaciones = [
            {
                "from_user": r["from_user"],
                "to_user": r["to_user"],
                "tipo": r["type"].lower(),   # FOLLOWS -> follows, BLOCKS -> blocks
                "since": r.get("since"),
            }
            for r in datos.get("relationships", [])
        ]
        print(f"⏳ Cargando {len(relaciones)} relaciones (INTERACTUA_CON)...")

        query_interactua = """
        UNWIND $relaciones AS rel
        MATCH (a:Usuario {user_id: rel.from_user})
        MATCH (b:Usuario {user_id: rel.to_user})
        MERGE (a)-[r:INTERACTUA_CON {tipo: rel.tipo}]->(b)
        SET r.desde = rel.since
        """

        # AMIGO_DE para follows recíprocos. a.user_id < b.user_id evita duplicar
        # la arista en ambos sentidos; obtener_recomendaciones lee sin dirección.
        query_amistad = """
        MATCH (a:Usuario)-[:INTERACTUA_CON {tipo:'follows'}]->(b:Usuario)
        WHERE (b)-[:INTERACTUA_CON {tipo:'follows'}]->(a)
          AND a.user_id < b.user_id
        MERGE (a)-[:AMIGO_DE]->(b)
        RETURN count(*) AS amistades
        """

        with self.driver.session() as session:
            session.run(query_interactua, relaciones=relaciones)
            resultado = session.run(query_amistad).single()
            amistades = resultado["amistades"] if resultado else 0

        print(f"✅ {len(relaciones)} relaciones INTERACTUA_CON y {amistades} amistades recíprocas (AMIGO_DE).")
        return {"interacciones": len(relaciones), "amistades": amistades}

    def cargar_dataset_completo(self, ruta_archivo):
        """Carga usuarios y relaciones de datasetMediano.json en un solo paso."""
        usuarios = self.cargar_usuarios_desde_dataset(ruta_archivo)
        rel = self.cargar_relaciones_desde_dataset(ruta_archivo)
        return {"usuarios": usuarios, **rel}

    def sugerir_amigos(self, username_actual):
        """
        Encuentra amigos de mis amigos usando la relación AMIGO_DE.
        """
        query = """
        MATCH (yo:Usuario {username: $username})-[:AMIGO_DE]->(amigo:Usuario)
        MATCH (amigo)-[:AMIGO_DE]->(sugerido:Usuario)
        WHERE yo <> sugerido
          AND NOT (yo)-[:AMIGO_DE]->(sugerido)
        RETURN sugerido.username AS username,
               sugerido.nombre AS nombre,
               COUNT(amigo) AS amigos_en_comun
        ORDER BY amigos_en_comun DESC
        LIMIT 5
        """
        with self.driver.session() as session:
            result = session.run(query, username=username_actual)
            return [linea.data() for linea in result]

    def obtener_lista_seguidos(self, username_actual):
        """
        Devuelve los usernames de las conexiones para alimentar el feed.
        """
        query = """
        MATCH (u:Usuario {username: $username})-[:AMIGO_DE]->(seguido:Usuario)
        RETURN seguido.username AS username
        """
        with self.driver.session() as session:
            result = session.run(query, username=username_actual)
            return [linea["username"] for linea in result]
