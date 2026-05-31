import json
import random
import faker


def main():
    fake = faker.Faker()

    lista_sesiones = []

    cantidad_sesiones = 100

    for _ in range(cantidad_sesiones):
        user_id = fake.uuid4()
        username = fake.user_name()
        display_name = fake.name()
        role = random.choice(["premium", "freemium"])
        ip = fake.ipv4()
        unread_notifications = random.randint(1, 99)

        session_data = {
            "user_id": user_id,
            "username": username,
            "display_name": display_name,
            "role": role,
            "ip_address": ip,
            "unread_notifications": str(unread_notifications)
        }

        lista_sesiones.append(session_data)

    nombre_archivo = "datos_base_sesiones.json"

    with open(nombre_archivo, "w", encoding="utf-8") as f:
        json.dump(lista_sesiones, f, indent=4, ensure_ascii=False)

    print(f"Dataset con {cantidad_sesiones} registros base generado en '{nombre_archivo}'")


if __name__ == "__main__":
    main()