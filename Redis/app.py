from flask import Flask, request, jsonify
from flask_cors import CORS
from redis_repository import SessionRepository

app = Flask(__name__)
CORS(app) 

repo = SessionRepository()

@app.route('/api/login', methods=['POST'])
def login():

    ip_cliente = request.remote_addr

    if repo.ip_esta_baneada(ip_cliente):
        return jsonify({"error": "Acceso denegado. Tu IP ha sido bloqueada."}), 403
    
    data = request.json or {}
    usuario_id = data.get("user_id") 
    username = data.get("username")

    if not usuario_id or not username:
        return jsonify({"error": "Faltan los datos 'user_id' o 'username'"}), 400

    

    token = repo.crear_sesion(user_id=usuario_id, username=username, ip_address=ip_cliente)
    
    repo.registrar_actividad(user_id=usuario_id)

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

        repo.registrar_actividad(user_id=sesion.get('user_id'))
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


@app.route('/api/admin/session', methods=['POST'])
def inspeccionar_sesion():
    """Recibe un token en formato JSON y devuelve los datos almacenados en su Hash de Redis"""
    data = request.json or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"error": "Se requiere el 'token' para realizar la inspección"}), 400
        
    # Reutilizamos el método del repositorio que lee el HGETALL
    sesion = repo.validar_sesion(token)
    
    if sesion:
        return jsonify({
            "mensaje": "Sesión localizada con éxito en Redis",
            "datos_sesion": sesion
        }), 200
    else:
        return jsonify({"error": "La sesión no existe, es inválida o ya ha expirado"}), 404

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


@app.route('/api/admin/unban', methods=['POST'])
def desbanear_usuario():
    """Recibe una IP en formato JSON y la elimina de la lista negra"""
    data = request.json or {}
    ip_a_desbanear = data.get("ip_address")
    
    if not ip_a_desbanear:
        return jsonify({"error": "Se requiere la ip_address para desbanear"}), 400
        
    exito = repo.desbanear_ip(ip_a_desbanear)
    
    if exito:
        return jsonify({"mensaje": f"IP {ip_a_desbanear} ha sido desbaneada con éxito y vuelve a tener acceso."}), 200
    else:
        return jsonify({"mensaje": f"La IP {ip_a_desbanear} no se encontraba en la lista negra."}), 404
    
    
if __name__ == '__main__':
    print("Iniciando API de la Red Social...")
    app.run(debug=True, port=5001)