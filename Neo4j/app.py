from flask import Flask, jsonify, render_template, request
from Neo4JService import Neo4jService
import json

app = Flask(__name__)

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
