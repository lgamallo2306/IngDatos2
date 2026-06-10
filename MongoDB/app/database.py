import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB", "social_network")

client: AsyncIOMotorClient = None


def get_database():
    return client[MONGO_DB]


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    print(f"✅ Conectado a MongoDB: {MONGO_URI} / {MONGO_DB}")


async def close_db():
    global client
    if client:
        client.close()
        print("🔌 Conexión a MongoDB cerrada.")
