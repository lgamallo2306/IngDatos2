import json
import os

from cassandra_repository import CassandraRepository

RUTA_DATASET = os.path.join(os.path.dirname(__file__), "..", "datasetMediano.json")


def cargar_dataset(repo, ruta=RUTA_DATASET):

    with open(ruta, "r", encoding="utf-8") as archivo:
        datos = json.load(archivo)

    feed_count = 0
    for entrada in datos.get("feed", []):
        try:
            repo.insertar_feed(
                owner_user_id=entrada["owner_user_id"],
                created_at=entrada["created_at"],
                post_id=entrada["post_id"],
                author_id=entrada["author_id"],
                author_username=entrada.get("author_username"),
                content_preview=entrada.get("content_preview"),
                post_type=entrada.get("post_type"),
            )
            feed_count += 1
        except Exception as e:
            print(f"[cargar_dataset] Error en feed: {e }")

    msg_count = 0
    for mensaje in datos.get("messages", []):
        try:
            repo.insertar_mensaje(
                conversation_id=mensaje["conversation_id"],
                sent_at=mensaje["sent_at"],
                message_id=mensaje.get("message_id"),
                sender_id=mensaje["sender_id"],
                receiver_id=mensaje.get("receiver_id"),
                content=mensaje.get("content"),
                is_read=bool(mensaje.get("read", False)),
                media_url=mensaje.get("media_url"),
            )
            msg_count += 1
        except Exception as e:
            print(f"[cargar_dataset] Error en mensaje: {e }")

    return feed_count, msg_count


if __name__ == "__main__":
    print("Se inicia la carga del dataset en Cassandra...")
    repositorio = CassandraRepository()
    try:
        feed, mensajes = cargar_dataset(repositorio)
        print(f"Carga finalizada: {feed } entradas de feed, {mensajes } mensajes")
    finally:
        repositorio.close()
