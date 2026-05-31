from redis_repository import SessionRepository

if __name__ == "__main__":

    repo = SessionRepository()

    mi_token = repo.crear_sesion(user_id="1001", device_os="Windows 11")

    repo.validar_sesion(mi_token)
    
    repo.cerrar_sesion(mi_token)

    repo.validar_sesion(mi_token)