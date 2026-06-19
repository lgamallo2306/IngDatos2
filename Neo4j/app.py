from flask import Flask, jsonify, render_template, request
from Neo4JService import Neo4jService
from flask_cors import CORS
import json

app = Flask(__name__, template_folder=".")
CORS(app)

dbGrafo = Neo4jService("bolt://localhost:7687", "neo4j", "password123")

try:
    with open("dataset.json", "r", encoding="utf-8") as archivo:
        datos_completos = json.load(archivo)

        basePublicaciones = datos_completos.get("posts", [])
except FileNotFoundError:
    basePublicaciones = []
    print("Aviso: No se encontró el archivo dataset.json")
except json.JSONDecodeError as e:
    basePublicaciones = []
    print(f" Error: El archivo JSON sigue teniendo fallas de sintaxis: {e }")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/amigos/<username>")
def api_amigos(username):
    try:
        datos = dbGrafo.obtener_amigos(username)
        return jsonify(datos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/familiares/<username>")
def api_familiares(username):
    try:
        datos = dbGrafo.obtener_familiares(username)
        return jsonify(datos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/recomendaciones")
def recomendaciones():
    username = request.args.get("username")
    if not username:
        return jsonify({"error": "Falta el nombre de usuario"}), 400

    try:
        datos = dbGrafo.obtener_recomendaciones(username)
        return jsonify(datos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/crear_amistad", methods=["POST"])
def api_crear_amistad():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username1 = datos.get("username1")
    username2 = datos.get("username2")
    if not username1 or not username2:
        return (
            jsonify({"error": "Faltan campos obligatorios: username1 y username2"}),
            400,
        )
    try:
        resultado = dbGrafo.crear_relacion_amigo(username1, username2)
        if not resultado:
            return (
                jsonify(
                    {
                        "error": f"Uno o ambos usuarios no existen en el grafo: '{username1 }', '{username2 }'"
                    }
                ),
                404,
            )
        return (
            jsonify(
                {
                    "mensaje": f"Amistad entre '{username1 }' y '{username2 }' creada con éxito",
                    "detalle": resultado,
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/crear_familiar", methods=["POST"])
def api_crear_Familiar():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username1 = datos.get("username1")
    username2 = datos.get("username2")
    if not username1 or not username2:
        return (
            jsonify({"error": "Faltan campos obligatorios: username1 y username2"}),
            400,
        )
    try:
        resultado = dbGrafo.crear_relacion_familiar(username1, username2)
        if not resultado:
            return (
                jsonify(
                    {
                        "error": f"Uno o ambos usuarios no existen en el grafo: '{username1 }', '{username2 }'"
                    }
                ),
                404,
            )
        return (
            jsonify(
                {
                    "mensaje": f"Familiar entre '{username1 }' y '{username2 }' creada con éxito",
                    "detalle": resultado,
                }
            ),
            201,
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/eliminar_amistad", methods=["DELETE"])
def api_eliminar_amistad():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400

    username1 = datos.get("username1")
    username2 = datos.get("username2")

    if not username1 or not username2:
        return (
            jsonify({"error": "Faltan campos obligatorios: username1 y username2"}),
            400,
        )

    try:
        resultado = dbGrafo.eliminar_relacion_amigo(username1, username2)
        cant_eliminadas = (
            resultado[0].get("relaciones_eliminadas", 0) if resultado else 0
        )

        if cant_eliminadas == 0:
            return (
                jsonify(
                    {
                        "mensaje": f"No existía una relación de amistad previa entre '{username1 }' y '{username2 }'"
                    }
                ),
                200,
            )

        return (
            jsonify(
                {
                    "mensaje": f"Amistad entre '{username1 }' y '{username2 }' eliminada con éxito"
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/eliminar_familiar", methods=["DELETE"])
def api_eliminar_familiar():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400

    username1 = datos.get("username1")
    username2 = datos.get("username2")

    if not username1 or not username2:
        return (
            jsonify({"error": "Faltan campos obligatorios: username1 y username2"}),
            400,
        )

    try:
        resultado = dbGrafo.eliminar_relacion_familiar(username1, username2)
        cant_eliminadas = (
            resultado[0].get("relaciones_eliminadas", 0) if resultado else 0
        )

        if cant_eliminadas == 0:
            return (
                jsonify(
                    {
                        "mensaje": f"No existía una relación familiar previa entre '{username1 }' y '{username2 }'"
                    }
                ),
                200,
            )

        return (
            jsonify(
                {
                    "mensaje": f"Relación familiar entre '{username1 }' y '{username2 }' eliminada con éxito"
                }
            ),
            200,
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/obtener_amigos_comun", methods=["GET"])
def api_obtener_amigos_comun():
    username1 = request.args.get("username1")
    username2 = request.args.get("username2")

    if not username1 or not username2:
        return (
            jsonify({"error": "Faltan campos obligatorios: username1 y username2"}),
            400,
        )

    try:

        resultado = dbGrafo.obtener_amigos_comun(username1, username2)

        return jsonify(resultado), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/actualizar_usuario", methods=["PUT"])
def api_actualizar_usuario():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username = datos.get("username")
    nuevo_nombre = datos.get("nuevo_nombre")
    if not username or not nuevo_nombre:
        return jsonify({"error": "Faltan campos: username y nuevo_nombre"}), 400
    try:
        resultado = dbGrafo.actualizar_usuario(username, nuevo_nombre)
        if not resultado:
            return jsonify({"error": f"Usuario '{username }' no encontrado"}), 404
        return jsonify({"mensaje": "Usuario actualizado", "detalle": resultado}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
