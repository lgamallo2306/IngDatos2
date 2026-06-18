from Neo4JService import Neo4jService   

#Configuracion del proyecto en Neo4j
URI = "bolt://localhost:7687"  
USER = "neo4j"                 
PASSWORD = "password123"

def main():
    try:
    #Conectar al motor
        db = Neo4jService(URI, USER, PASSWORD)
        print("Conexión establecida con Neo4j.\n")

    except Exception as e:
        print(f"Ocurrió un error: {e}")
        
    finally:
        #Cerrar el driver de forma segura
        db.close()
        print("\nConexión cerrada.")

if __name__ == "__main__":
    main()