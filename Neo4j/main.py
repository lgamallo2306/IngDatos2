from Neo4JService import Neo4jService   

#Configuracion del proyecto en Neo4j
URI = "bolt://localhost:7687"  
USER = "neo4j"                 
PASSWORD = "Independiente2026"     

def main():
    #Conectar al motor
    db = Neo4jService(URI, USER, PASSWORD)
    print("Conexión establecida con Neo4j.\n")

    try:
        # 2. Crear usuarios de prueba (Agregamos nuevos para la red más grande)
        print("Creando usuarios...")
        db.crear_usuario("lautaro_g", "Lautaro")
        db.crear_usuario("ana_p", "Ana")
        db.crear_usuario("carlos_m", "Carlos")
        db.crear_usuario("sofia_b", "Sofia")
        db.crear_usuario("mariano_r", "Mariano")
        db.crear_usuario("bautista_f", "Bautista")
        db.crear_usuario("elena_m", "Elena")

        # 3. Establecer relaciones de amistad
        print("Estableciendo relaciones de amistad...")
        
        # Ana es amiga de todos los viejos conocidos
        db.crear_relacion_amigo("lautaro_g", "ana_p")
        db.crear_relacion_amigo("ana_p", "carlos_m")
        db.crear_relacion_amigo("ana_p", "sofia_b")

        # Mariano va a ser un amigo súper conectado: es amigo de Ana, Carlos Y Sofia.
        db.crear_relacion_amigo("mariano_r", "ana_p")
        db.crear_relacion_amigo("mariano_r", "carlos_m")
        db.crear_relacion_amigo("mariano_r", "sofia_b")

        # Bautista es amigo de Carlos y de Sofia (pero NO conoce a Ana)
        db.crear_relacion_amigo("bautista_f", "carlos_m")
        db.crear_relacion_amigo("bautista_f", "sofia_b")

        # Elena es una usuaria nueva que solo es amiga de Ana por ahora
        db.crear_relacion_amigo("elena_m", "ana_p")
        
        #Probar la función avanzada: "Quizás conozcas a" para Lautaro
        print("\n--- Ejecutando función 'Quizás conozcas a' para 'lautaro_g' ---")
        recomendaciones = db.obtener_recomendaciones("lautaro_g")
        
        for rec in recomendaciones:
            print(f"Te recomendamos a: {rec['nombre']} (@{rec['recomendado']}) - Amigos en común: {rec['amigos_en_comun']}")

    except Exception as e:
        print(f"Ocurrió un error: {e}")
        
    finally:
        #Cerrar el driver de forma segura
        db.close()
        print("\nConexión cerrada.")

if __name__ == "__main__":
    main()
