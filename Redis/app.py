from flask import Flask, request, jsonify
from flask_cors import CORS
from redis_repository import SessionRepository

app = Flask(__name__)
CORS(app) 

repo = SessionRepository()

@app.route('/api/login', methods=['POST'])
def login():

    data = request.json or {}
    usuario_id = data.get("user_id") 
    username = data.get("username")

    if not usuario_id or not username:
        return jsonify({"error": "Faltan los datos 'user_id' o 'username'"}), 400

    ip_cliente = request.remote_addr

    token = repo.crear_sesion(user_id=usuario_id, username=username, ip_address=ip_cliente)
    
    return jsonify({
        "mensaje": "Login exitoso",
        "token": token
    }), 200


@app.route('/api/feed', methods=['GET'])
def ver_feed():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Falta el token de autorización"}), 401
        
    token = auth_header.split(" ")[1]
    
    sesion = repo.validar_sesion(token)
    
    if sesion:
        return jsonify({
            "mensaje": "Acceso autorizado al Feed",
            "usuario": sesion
        }), 200
    else:
        return jsonify({"error": "Sesión inválida o expirada"}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        repo.cerrar_sesion(token)
        
    return jsonify({"mensaje": "Sesión cerrada correctamente"}), 200

@app.route('/api/admin/online', methods=['GET'])
def usuarios_online():
    """Devuelve la cantidad de usuarios activos en los últimos 5 minutos"""
    activos = repo.contar_usuarios_online()
    return jsonify({"usuarios_activos_ahora_mismo": activos}), 200


@app.route('/api/admin/ban', methods=['POST'])
def banear_usuario():
    """Recibe una IP en formato JSON y la bloquea por 24 horas"""
    data = request.json or {}
    ip_a_banear = data.get("ip_address")
    
    if not ip_a_banear:
        return jsonify({"error": "Se requiere la ip_address para banear"}), 400
        
    repo.banear_ip(ip_a_banear)
    return jsonify({"mensaje": f"IP {ip_a_banear} ha sido baneada con éxito."}), 200

if __name__ == '__main__':
    print("Iniciando API de la Red Social...")
    app.run(debug=True, port=5001)