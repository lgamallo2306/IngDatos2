from Neo4JService import Neo4jService

URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "password123"


def main():
    try:

        db = Neo4jService(URI, USER, PASSWORD)
        print("Conexión establecida con Neo4j.\n")

    except Exception as e:
        print(f"Ocurrió un error: {e }")

    finally:

        db.close()
        print("\nConexión cerrada.")


if __name__ == "__main__":
    main()
