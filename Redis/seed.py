import json
from redis_repository import SessionRepository


def poblar_redis():
    print("Se inicia la carga")
    repo = SessionRepository()

    ruta_dataset = "../datasetMediano.json"
    try:
        with open(ruta_dataset, "r", encoding="utf-8") as archivo:
            contenido = archivo.read()
            dataset = json.loads(contenido)
    except FileNotFoundError:
        print("No se encontro el archivo")
        return
    except json.JSONDecodeError as e:
        print(f"JSON inválido en el dataset:")
        print(f"   → Línea {e .lineno }, columna {e .colno }: {e .msg }")

        lineas = contenido.splitlines()
        inicio = max(0, e.lineno - 3)
        fin = min(len(lineas), e.lineno + 2)
        print("\n   Contexto:")
        for i, linea in enumerate(lineas[inicio:fin], start=inicio + 1):
            marcador = ">>> " if i == e.lineno else "    "
            print(f"   {marcador }{i }: {linea }")
        return

    usuarios = dataset.get("users", [])
    contador = 0

    for usuario in usuarios:
        datos_sesion = usuario.get("session")

        if datos_sesion is not None:
            repo.cargar_sesion_desde_json(
                user_id=usuario["user_id"],
                username=usuario["username"],
                session_data=datos_sesion,
            )
            contador += 1

    print(f"Carga Finalizada: {contador } sesiones importadas")


if __name__ == "__main__":
    poblar_redis()
