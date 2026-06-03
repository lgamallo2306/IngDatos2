<<<<<<< Updated upstream
from flask import Flask, jsonify, request
=======
from flask import Flask, jsonify, render_template, request
>>>>>>> Stashed changes
from flask_cors import CORS
from Neo4JService import Neo4jService
import json

<<<<<<< Updated upstream
app = Flask(__name__)
CORS(app)  # Permite que React (port 5173) hable con Flask (port 5000)
=======
app = Flask(__name__, template_folder='.')
CORS(app, origins=["http://localhost:5173"])
>>>>>>> Stashed changes

dbGrafo = Neo4jService("bolt://localhost:7687", "neo4j", "Independiente2026")

try:
    with open('MOCK_DATA_Publicaciones.json', 'r', encoding='utf-8') as archivo:
        basePublicaciones = json.load(archivo)
except FileNotFoundError:
    basePublicaciones = []
    print("Aviso: No se encontró el archivo MOCK_DATA_Publicaciones.json")

<<<<<<< Updated upstream
=======
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/cargar-grafo', methods=['POST'])
def cargar_grafo():
    # datasetMediano.json está en la raíz del repo, un nivel arriba de /Neo4j
    ruta = '../datasetMediano.json'
    try:
        resultado = dbGrafo.cargar_dataset_completo(ruta)
        return jsonify({"status": "ok", **resultado}), 200
    except FileNotFoundError:
        return jsonify({"error": f"No se encontró el dataset en {ruta}"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

>>>>>>> Stashed changes
@app.route('/api/recomendaciones')
def recomendaciones():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Falta el nombre de usuario"}), 400
    try:
        datos = dbGrafo.obtener_recomendaciones(username)
        return jsonify(datos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/feed')
def feed_publicaciones():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Falta el nombre de usuario"}), 400
    try:
        seguidos = dbGrafo.obtener_lista_seguidos(username)
        feedUsuario = [post for post in basePublicaciones if post['autor_user'] in seguidos]
        return jsonify(feedUsuario)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios', methods=['POST'])
def crear_usuario():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
        
    username = datos.get('username')
    nombre = datos.get('nombre')

    if not username or not nombre:
        return jsonify({"error": "Faltan campos obligatorios (username y nombre)"}), 400

    try:
        nuevo_usuario = dbGrafo.crear_usuario(username, nombre)
        return jsonify({"mensaje": "Usuario creado con éxito en el grafo", "usuario": nuevo_usuario}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/relaciones', methods=['POST'])
def crear_relacion():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400

    username1 = datos.get('username1')
    username2 = datos.get('username2')

    if not username1 or not username2:
        return jsonify({"error": "Faltan los nombres de usuario para conectar (username1 y username2)"}), 400

    try:
        resultado_relacion = dbGrafo.crear_relacion_amigo(username1, username2)
        return jsonify({"mensaje": "Vínculo de amistad creado en el grafo", "detalle": resultado_relacion}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios', methods=['DELETE'])
def eliminar_usuario():
    username = request.args.get('username')
    if not username:
        return jsonify({"error": "Falta el parámetro 'username' para eliminar"}), 400
    try:
        dbGrafo.eliminar_usuario(username)
        return jsonify({"mensaje": f"Usuario '{username}' eliminado con éxito del grafo"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)