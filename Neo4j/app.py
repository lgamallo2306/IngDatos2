from flask import Flask, jsonify, render_template, request
from Neo4JService import Neo4jService
import json

app = Flask(__name__, template_folder='.')

# Conexión a tu Neo4j local (¡Cambia la contraseña!)
dbGrafo = Neo4jService("bolt://localhost:7687", "neo4j", "Independiente2026")

# --- SIMULADOR DE MONGODB/CASSANDRA ---
try:
    with open('MOCK_DATA_Publicaciones.json', 'r', encoding='utf-8') as archivo:
        basePublicaciones = json.load(archivo)
except FileNotFoundError:
    basePublicaciones = []
    print("Aviso: No se encontró el archivo MOCK_DATA_Publicaciones.json")

@app.route('/')
def index():
    return render_template('index.html')

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
        # LLAMADA AL SERVICE: Llama a tu función exacta del Neo4jService
        nuevo_usuario = dbGrafo.crear_usuario(username, nombre)
        return jsonify({"mensaje": "Usuario creado con éxito en el grafo", "usuario": nuevo_usuario}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 4. CREAR UNA RELACIÓN DE AMISTAD/SEGUIMIENTO
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
        # LLAMADA AL SERVICE: Vincula los dos nodos mediante la arista
        resultado_relacion = dbGrafo.crear_relacion_amigo(username1, username2)
        return jsonify({"mensaje": "Vínculo de amistad creado en el grafo", "detalle": resultado_relacion}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/usuarios', methods=['DELETE'])
def eliminar_usuario():
    # Capturamos el username que viene como parámetro en la URL (ej: /api/usuarios?username=luca_94)
    username = request.args.get('username')

    if not username:
        return jsonify({"error": "Falta el parámetro 'username' para eliminar"}), 400

    try:
        # LLAMADA AL SERVICE: Usamos el método de tu Neo4jService
        # (Asegurate de que en tu Neo4JService.py la función se llame 'eliminar_usuario')
        dbGrafo.eliminar_usuario(username)
        return jsonify({"mensaje": f"Usuario '{username}' eliminado con éxito del grafo"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/crear_usuario', methods=['POST'])
def api_crear_usuario():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username = datos.get('username')
    nombre = datos.get('nombre')
    if not username or not nombre:
        return jsonify({"error": "Faltan campos obligatorios: username y nombre"}), 400
    try:
        nuevo = dbGrafo.crear_usuario(username, nombre)
        return jsonify({"mensaje": "Usuario creado con éxito en el grafo", "usuario": nuevo}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/eliminar_usuario', methods=['POST'])
def api_eliminar_usuario():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username = datos.get('username')
    if not username:
        return jsonify({"error": "Falta el campo obligatorio: username"}), 400
    try:
        dbGrafo.eliminar_usuario(username)
        return jsonify({"mensaje": f"Usuario '{username}' eliminado con éxito del grafo"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/crear_amistad', methods=['POST'])
def api_crear_amistad():
    datos = request.get_json()
    if not datos:
        return jsonify({"error": "No se enviaron datos"}), 400
    username1 = datos.get('username1')
    username2 = datos.get('username2')
    if not username1 or not username2:
        return jsonify({"error": "Faltan campos obligatorios: username1 y username2"}), 400
    try:
        resultado = dbGrafo.crear_relacion_amigo(username1, username2)
        return jsonify({"mensaje": f"Amistad entre '{username1}' y '{username2}' creada con éxito", "detalle": resultado}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
