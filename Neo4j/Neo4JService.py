from neo4j import GraphDatabase
import json

class Neo4jService:
    def __init__(self, uri, user, password):
        """
        Inicializa la conexión con la base de datos Neo4j.
        Buenas prácticas: Se utiliza un único Driver para la aplicación.
        """
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        """Cierra la conexión con el clúster o base de datos."""
        self.driver.close()

    #OPERACIONES BÁSICAS

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
        Operación Avanzada: Algoritmo "Quizás conozcas a".
        Busca amigos de mis amigos que NO sean mis amigos actualmente, 
        y los ordena por la cantidad de amigos en común.
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
        Lee un archivo JSON de Mockaroo e inyecta los datos de forma masiva en Neo4j
        usando UNWIND para optimizar el rendimiento de la carga.
        """
        # 1. Leer el archivo JSON desde tu computadora
        try:
            with open(ruta_archivo, 'r', encoding='utf-8') as archivo:
                datos = json.load(archivo)
        except FileNotFoundError:
            print(f"❌ Error: No se encontró el archivo en la ruta: {ruta_archivo}")
            return
        except json.JSONDecodeError:
            print("❌ Error: El archivo no tiene un formato JSON válido.")
            return

<<<<<<< HEAD:Neo4JService.py
        print(f"⏳ Procesando e inyectando {len(datos)} registros en Neo4j...")

        # 2. La Query de Cypher optimizada para cargas masivas (UNWIND)
        # Nota: Cambiá 'user_name' y 'first_name' según los campos exactos de tu JSON
        query = """
        UNWIND $lista_datos AS fila
        MERGE (u:Usuario {username: fila.user_name})
        ON CREATE SET u.nombre = fila.first_name, 
                      u.apellido = fila.last_name,
                      u.id_original = fila.id
        """

        # 3. Ejecutar la carga segura dentro de la sesión   
        with self.driver.session() as session:
            try:
                session.run(query, lista_datos=datos)
                print("✅ ¡Inyección masiva completada con éxito en el grafo!")
            except Exception as e:
                print(f"❌ Ocurrió un error al interactuar con Neo4j: {e}")
    def sugerir_amigos(self, username_actual):
        """
        [CONSULTA AVANZADA] Encuentra "amigos de mis amigos" que el 
        usuario actual todavía no sigue, ordenados por relevancia.
        """
        query = """
        MATCH (yo:Usuario {username: $username})-[r1:INTERACTUA_CON {tipo: 'follows'}]->(amigo:Usuario)
        MATCH (amigo)-[r2:INTERACTUA_CON {tipo: 'follows'}]->(sugerido:Usuario)
        WHERE yo <> sugerido 
          AND NOT (yo)-[:INTERACTUA_CON {tipo: 'follows'}]->(sugerido)
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
        [FUNCIÓN PARA INTERACCIÓN] Devuelve los usernames de la gente que sigue
        el usuario actual. Sirve para alimentar el feed de Cassandra o Mongo.
        """
        query = """
        MATCH (u:Usuario {username: $username})-[r:INTERACTUA_CON {tipo: 'follows'}]->(seguido:Usuario)
        RETURN seguido.username AS username
        """
        with self.driver.session() as session:
            result = session.run(query, username=username_actual)
            return [linea["username"] for linea in result]
        
=======
        
>>>>>>> b5561ce2b8576d81e91efff684cbe9afde6b7ee6:Neo4j/Neo4JService.py
