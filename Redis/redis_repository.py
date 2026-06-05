import redis 
import uuid

class SessionRepository:
    def __init__(self, host='localhost', port=6379, db=0):
        self.client = redis.Redis(host=host, port=port, db=db, decode_responses=True)
        self.session_ttl = 3600

    def crear_sesion(self, user_id, device_os="Web"):
        token = str(uuid.uuid4())
        key = f"auth:session:{token}"

        self.client.hset(key, mapping={
            "user_id": user_id,
            "device": device_os
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