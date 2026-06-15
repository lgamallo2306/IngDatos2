import json
from Neo4JService import Neo4jService   

# 1. Configuración de conexión con Neo4j
URI = "bolt://localhost:7687"  
USER = "neo4j"                 
PASSWORD = "password123"
RUTA_DATASET = "../datasetMediano.json"

def main():
    print("🔄 Iniciando cargador inteligente de dataset...")
    
    # 2. Leer el archivo JSON
    try:
        with open(RUTA_DATASET, 'r', encoding='utf-8') as archivo:
            datos_brutos = json.load(archivo)
    except FileNotFoundError:
        print(f"❌ Error: No se encontró el archivo '{RUTA_DATASET}'. Verificá que esté en esta misma carpeta.")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Error: El archivo JSON tiene un error de sintaxis: {e}")
        return

    # 3. Desenvolver el JSON si viene adentro de un objeto/clave 'feed'
    if isinstance(datos_brutos, dict):
        # Buscamos la primera lista disponible adentro del diccionario (ej: 'feed' o 'posts')
        lista_usuarios = next((v for v in datos_brutos.values() if isinstance(v, list)), None)
        if lista_usuarios is None:
            # Si no hay listas internas, probamos con el diccionario mismo metido en una lista
            lista_usuarios = [datos_brutos]
    else:
        lista_usuarios = datos_brutos

    if not lista_usuarios or not isinstance(lista_usuarios, list):
        print("❌ Error: No se pudo encontrar una lista de registros válida en el JSON.")
        return

    # 4. DIAGNÓSTICO: Analizar las claves del primer registro real
    primer_registro = next((r for r in lista_usuarios if isinstance(r, dict)), None)
    if not primer_registro:
        print("❌ Error: Los elementos de la lista no son objetos/diccionarios válidos.")
        return

    claves_disponibles = list(primer_registro.keys())
    print(f"🔍 Estructura detectada en tu JSON. Claves disponibles: {claves_disponibles}")

    # Mapeo inteligente de claves para el ID y el Nombre
    posibles_ids = ['username', 'user_id', 'id', 'usuario', 'id_usuario', 'user']
    posibles_nombres = ['nombre', 'name', 'first_name', 'nickname', 'display_name']

    clave_id = next((c for c in posibles_ids if c in claves_disponibles), None)
    clave_nombre = next((c for c in posibles_nombres if c in claves_disponibles), None)

    # Si no encuentra ninguna conocida, agarra las primeras que existan
    if not clave_id:
        clave_id = claves_disponibles[0]
    if not clave_nombre:
        clave_nombre = claves_disponibles[1] if len(claves_disponibles) > 1 else clave_id

    print(f"🎯 Mapeo seleccionado de forma automática:")
    print(f"   - Identificador único (username): '{clave_id}'")
    print(f"   - Nombre para mostrar (nombre): '{clave_nombre}'\n")

    # 5. Filtrado y Limpieza de datos
    datos_filtrados = []
    for reg in lista_usuarios:
        if isinstance(reg, dict):
            id_valor = reg.get(clave_id)
            nombre_valor = reg.get(clave_nombre) or "Usuario Anónimo"
            
            # Solo guardamos si el ID de verdad contiene algo válido
            if id_valor is not None and str(id_valor).strip() != "" and str(id_valor).lower() != "null":
                datos_filtrados.append({
                    'id_limpio': str(id_valor),
                    'nombre_limpio': str(nombre_valor)
                })

    print(f"⏳ Procesando e inyectando {len(datos_filtrados)} registros limpios en Neo4j...")

    # 6. Conexión e inyección masiva optimizada con UNWIND
    db = Neo4jService(URI, USER, PASSWORD)
    
    # Consulta Cypher genérica usando nuestro mapa limpio hecho en Python
    query = """
    UNWIND $batch AS fila
    MERGE (u:Usuario {username: fila.id_limpio})
    SET u.nombre = fila.nombre_limpio
    """
    
    try:
        with db.driver.session() as session:
            session.run(query, batch=datos_filtrados)
        print("✅ ¡Carga masiva finalizada con un éxito rotundo! No se saltó ningún dato por error de mapeo.")
    except Exception as e:
        print(f"❌ Error crítico al interactuar con Neo4j: {e}")
    finally:
        db.close()
        print("🔌 Conexión con Neo4j cerrada de forma segura.")

if __name__ == "__main__":
    main()