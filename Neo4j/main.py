from Neo4JService import Neo4jService

# Configuracion del proyecto en Neo4j
URI = "bolt://localhost:7687"
USER = "neo4j"
PASSWORD = "Independiente2026"

# datasetMediano.json vive en la raíz del repo, un nivel arriba de /Neo4j.
# Es el mismo dataset que carga Cassandra, así toda la app comparte los datos.
RUTA_DATASET = "../datasetMediano.json"

# Usuario real del dataset para probar las recomendaciones.
USUARIO_PRUEBA = "luca_gonzalez940"


def main():
    db = Neo4jService(URI, USER, PASSWORD)
    print("Conexión establecida con Neo4j.\n")

    try:
        # Carga masiva: usuarios + relaciones (INTERACTUA_CON y AMIGO_DE).
        print("Cargando dataset en el grafo...")
        resumen = db.cargar_dataset_completo(RUTA_DATASET)
        print(
            f"\nResumen de carga: {resumen['usuarios']} usuarios, "
            f"{resumen['interacciones']} relaciones, "
            f"{resumen['amistades']} amistades recíprocas.\n"
        )

        # Probar la función avanzada "Quizás conozcas a".
        print(f"--- 'Quizás conozcas a' para '{USUARIO_PRUEBA}' ---")
        recomendaciones = db.obtener_recomendaciones(USUARIO_PRUEBA)

        if not recomendaciones:
            print("(Sin recomendaciones: el usuario no tiene amistades recíprocas en el dataset.)")
        for rec in recomendaciones:
            print(
                f"Te recomendamos a: {rec['nombre']} (@{rec['recomendado']}) "
                f"- Amigos en común: {rec['amigos_en_comun']}"
            )

    except FileNotFoundError:
        print(f"❌ No se encontró el dataset en {RUTA_DATASET}")
    except Exception as e:
        print(f"Ocurrió un error: {e}")

    finally:
        db.close()
        print("\nConexión cerrada.")


if __name__ == "__main__":
    main()
