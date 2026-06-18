import json
import os
from Neo4JService import Neo4jService

URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "password123"
RUTA_DATASET = os.path.join(os.path.dirname(__file__), "..", "datasetMediano.json")


def cargar_dataset(db, ruta=RUTA_DATASET):
    """Carga nodos Usuario y relaciones AMIGO_DE desde el dataset. Devuelve (usuarios, relaciones)."""
    with open(ruta, "r", encoding="utf-8") as archivo:
        datos = json.load(archivo)

    usuarios = datos.get("users", [])

    # Cargar nodos Usuario
    batch_usuarios = [
        {"username": u["username"], "nombre": u.get("display_name") or u["username"]}
        for u in usuarios
        if u.get("username")
    ]
    query_usuarios = """
    UNWIND $batch AS fila
    MERGE (u:Usuario {username: fila.username})
    SET u.nombre = fila.nombre
    """
    with db.driver.session() as session:
        session.run(query_usuarios, batch=batch_usuarios)

    # Mapeo user_id → username para resolver las relaciones
    id_a_username = {u["user_id"]: u["username"] for u in usuarios if u.get("user_id") and u.get("username")}

    # Cargar relaciones FOLLOWS como AMIGO_DE
    batch_rels = []
    for rel in datos.get("relationships", []):
        if rel.get("type") != "FOLLOWS":
            continue
        u1 = id_a_username.get(rel.get("from_user"))
        u2 = id_a_username.get(rel.get("to_user"))
        if u1 and u2:
            batch_rels.append({"username1": u1, "username2": u2})

    query_rels = """
    UNWIND $batch AS rel
    MATCH (a:Usuario {username: rel.username1})
    MATCH (b:Usuario {username: rel.username2})
    MERGE (a)-[:AMIGO_DE]->(b)
    """
    with db.driver.session() as session:
        session.run(query_rels, batch=batch_rels)

    return len(batch_usuarios), len(batch_rels)


if __name__ == "__main__":
    print("Iniciando carga del dataset en Neo4j...")
    db = Neo4jService(URI, USER, PASSWORD)
    try:
        usuarios, relaciones = cargar_dataset(db)
        print(f"Carga finalizada: {usuarios} nodos Usuario, {relaciones} relaciones AMIGO_DE")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()