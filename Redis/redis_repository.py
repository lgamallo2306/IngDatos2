import redis 
import uuid
import time

class SessionRepository:
    def __init__(self, host='localhost', port=6379, db=0):
        self.client = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self.session_ttl = 3600

    def crear_sesion(self, user_id, username, ip_address):
        
        token = str(uuid.uuid4())
        key = f"auth:session:{token}"

        self.client.hset(key, mapping={
            "user_id": user_id,
            "username": username,
            "ip_address": ip_address
        })

        self.client.expire(key, self.session_ttl)
        print(f"Sesion Creada token: {token}")
        return token
    
    def validar_sesion(self, token):
        key = f"auth:session:{token}"
        session_data = self.client.hgetall(key)

        if session_data:
            self.client.expire(key, self.session_ttl)
            print(f"Sesion validada para el usuario: {session_data.get('user_id')}")
            return session_data
        
        print("Session invalida")
        return None
    
    def cerrar_sesion(self, token):
        key = f"auth:session:{token}"
        self.client.delete(key)
        print("Sesión destruida.")

    def cargar_sesion_desde_json(self, user_id, username, session_data):

        token = session_data["token_hash"]
        key = f"auth:session:{token}"

        self.client.hset(key, mapping={
            "user_id": user_id,
            "username": username,
            "ip_address": session_data.get("ip_address", "Desconocida")
        })

        self.client.expire(key, session_data.get("ttl", 3600))

        print(f"Sesión importada: {username} (Token: {token[:8]}...)")


    #
    # MONITOREAR USUARIOS
    #
    def registrar_actividad(self, user_id):

        timestamp_actual = int(time.time())
        self.client.zadd("metricas:usuarios_online", {user_id: timestamp_actual})

    def contar_usuarios_online(self, margen_minutos=5):

        tiempo_limite = int(time.time()) - (margen_minutos * 60)
        
        self.client.zremrangebyscore("metricas:usuarios_online",0, tiempo_limite)

        activos = self.client.zcard("metricas:usuarios_online")

        return activos
    
    #
    # BANEAR IP
    #

    def banear_ip(self, ip_address, timpo_segundos= 86400):

        key = f"blacklist:ip:{ip_address}"

        self.client.set(key, "bloqueado", ex=timpo_segundos)
        print(f"La IP: {ip_address} fue agregada a la Blacklist")

    def ip_esta_baneada(self, ip_address):
        key = f"blacklist:ip:{ip_address}"
        return self.client.exists(key) > 0    
