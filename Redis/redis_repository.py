import redis 
import uuid


class SessionRepository:
    def __init__(self, host='localhost', port=6379, db=0):
        self.client = redis.Redis(host= host, port=port, db=db, decode_responses=True)
        self.session_ttl = 3600

    def crear_sesion(self, user_id, device_os="Web"):
        """Se Genera un token y se guarda la sesion en un Hash"""

        token = str(uuid.uuid4())
        key = f"auth:session:{token}"

        self.client.hset(key, mapping={
            "user_id": user_id,
            "device": device_os
        })

        self.client.expire(key, self.session_ttl)

        print(f"Sesion Creada toker: {token}")
        return token
    
    def validar_sesion(self, token):
        """Busca el token. Si existe devuelve los datos y acualiza el ttl"""

        key = f"auth:session:{token}"

        session_data = self.client.hgetall(key)

        if session_data:
            self.client.expire(key, self.session_ttl)
            print(f"Sesion validada para el usuario: {session_data.get('user_id')}")
            return session_data
        print(f"Session invalida")

        return None
    
    def cerrar_sesion(self, token):
        """Elimina la clave de memoria de forma inmediata"""
        key = f"auth:session:{token}"
        self.client.delete(key)
        print("Sesión destruida.")