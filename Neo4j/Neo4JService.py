from neo4j import GraphDatabase

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

    def crear_relacion_familiar(self, username1, username2):
        query = """
        MATCH (a:Usuario {username: $username1})
        MATCH (b:Usuario {username: $username2})
        MERGE (a)-[r:FAMILIAR_DE]->(b)
        RETURN type(r) AS relacion
        """
        with self.driver.session() as session:
            result = session.run(query, username1=username1, username2=username2)
            return result.data()

    def eliminar_relacion_amigo(self, username1, username2):
        query = """
        MATCH (a:Usuario {username: $username1})-[r:AMIGO_DE]-(b:Usuario {username: $username2})
        DELETE r
        RETURN count(r) AS relaciones_eliminadas
        """
        with self.driver.session() as session:
            result = session.run(query, username1= username1, username2=username2)
            return result.data()
        
    def eliminar_relacion_familiar(self, username1, username2):
        query = """
        MATCH (a:Usuario {username: $username1})-[r:FAMILIAR_DE]-(b:Usuario {username: $username2})
        DELETE r
        RETURN count(r) AS relaciones_eliminadas
        """
        with self.driver.session() as session:
            result = session.run(query, username1=username1, username2=username2)
            return result.data()

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

    def obtener_amigos_comun(self, username1, username2):
        """
        Encuentra los usuarios que tienen una relación de amistad en común
        entre dos usuarios específicos.
        """
        query = """
        MATCH (a:Usuario {username: $username1})-[:AMIGO_DE]-(comun:Usuario)-[:AMIGO_DE]-(b:Usuario {username: $username2})
        RETURN comun.username AS username, comun.nombre AS nombre
        """
        with self.driver.session() as session:
            result = session.run(query, username1 = username1, username2 = username2)
            return result.data()

    def actualizar_usuario(self, username, nuevo_nombre):
        query = """
        MATCH (u:Usuario {username: $username})
        SET u.nombre = $nuevo_nombre
        RETURN u.username AS username, u.nombre AS nombre
        """
        with self.driver.session() as session:
            result = session.run(query, username=username, nuevo_nombre=nuevo_nombre)
            return result.data()
