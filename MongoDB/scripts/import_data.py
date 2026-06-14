"""
Script de importación del dataset a MongoDB.
Carga users y posts en la base social_network.
Uso: python scripts/import_data.py
"""

import json
import sys
import os
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "social_network")

# Ajustá esta ruta si tu dataset está en otro lugar
DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "datasetMediano.json")


def load_dataset(path: str) -> dict:
    print(f"📂 Leyendo dataset desde: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def create_indexes(db):
    print("\n🔧 Creando índices...")

    # --- users ---
    db.users.create_index([("username", ASCENDING)], unique=True, name="idx_username")
    db.users.create_index([("email", ASCENDING)],    unique=True, name="idx_email")
    db.users.create_index([("location", ASCENDING)],              name="idx_location")
    db.users.create_index([("interests", ASCENDING)],             name="idx_interests")   # multikey
    db.users.create_index([("settings.is_active", ASCENDING)],    name="idx_is_active")
    print("  ✅ users: username, email, location, interests, is_active")

    # --- posts ---
    db.posts.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_user_date")
    db.posts.create_index([("tags", ASCENDING)],                                 name="idx_tags")       # multikey
    db.posts.create_index([("visibility", ASCENDING)],                           name="idx_visibility")
    db.posts.create_index([("likes_count", DESCENDING)],                         name="idx_likes")
    db.posts.create_index([("content", TEXT)],                                   name="idx_content_text")
    print("  ✅ posts: user_id+created_at, tags, visibility, likes_count, text(content)")


def import_users(db, users: list) -> int:
    if not users:
        print("⚠️  No hay usuarios para importar.")
        return 0

    # Usamos user_id como _id para facilitar joins con otras bases
    docs = []
    for u in users:
        doc = u.copy()
        doc["_id"] = doc.pop("user_id")   # user_id se convierte en _id
        docs.append(doc)

    db.users.drop()
    result = db.users.insert_many(docs)
    return len(result.inserted_ids)


def import_posts(db, posts: list) -> int:
    if not posts:
        print("⚠️  No hay posts para importar.")
        return 0

    docs = []
    for p in posts:
        doc = p.copy()
        doc["_id"] = doc.pop("post_id")   # post_id se convierte en _id
        docs.append(doc)

    db.posts.drop()
    result = db.posts.insert_many(docs)
    return len(result.inserted_ids)


def print_summary(db):
    print("\n📊 Resumen de la base de datos:")
    print(f"  usuarios : {db.users.count_documents({})}")
    print(f"  posts    : {db.posts.count_documents({})}")

    # Muestra de índices
    print("\n📑 Índices creados:")
    for col in ["users", "posts"]:
        indexes = db[col].index_information()
        for name in indexes:
            if name != "_id_":
                print(f"  [{col}] {name}")


def main():
    dataset_path = sys.argv[1] if len(sys.argv) > 1 else DATASET_PATH

    if not os.path.exists(dataset_path):
        print(f"❌ No se encontró el dataset en: {dataset_path}")
        print("   Copiá el archivo datasetMediano.json dentro de la carpeta data/")
        sys.exit(1)

    data = load_dataset(dataset_path)

    print(f"\n🔌 Conectando a MongoDB: {MONGO_URI} / {MONGO_DB}")
    client = MongoClient(MONGO_URI)
    db = client[MONGO_DB]

    # Importar
    print("\n📥 Importando colecciones...")
    n_users = import_users(db, data.get("users", []))
    print(f"  ✅ users  : {n_users} documentos insertados")

    n_posts = import_posts(db, data.get("posts", []))
    print(f"  ✅ posts  : {n_posts} documentos insertados")

    create_indexes(db)
    print_summary(db)

    print("\n✅ Importación completa. Podés verificar en MongoDB Compass.")
    client.close()


if __name__ == "__main__":
    main()
