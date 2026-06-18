from datetime import datetime, timezone
from uuid import uuid4

from flask import Flask, request, jsonify
from flask_cors import CORS

from cassandra_repository import CassandraRepository

app = Flask(__name__)
CORS(app)

repo = CassandraRepository()


# =========================================================================
# FEED — CRUD base
# =========================================================================

@app.route('/feed/<owner_id>', methods=['GET'])
def get_feed(owner_id):
    try:
        return jsonify(repo.obtener_feed(owner_id)), 200
    except ValueError:
        return jsonify({"error": "UUID inválido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/feed', methods=['POST'])
def crear_feed_entry():
    try:
        body = request.json or {}
        repo.insertar_feed(
            owner_user_id=body["ownerUserId"],
            created_at=body.get("createdAt") or datetime.now(timezone.utc),
            post_id=body["postId"],
            author_id=body["authorId"],
            author_username=body.get("authorUsername"),
            content_preview=body.get("contentPreview"),
            post_type=body.get("postType"),
        )
        return jsonify({"status": "creado"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/feed/<owner_id>/<created_at>/<post_id>', methods=['DELETE'])
def eliminar_feed_entry(owner_id, created_at, post_id):
    try:
        repo.eliminar_feed(owner_id, created_at, post_id)
        return jsonify({"status": "eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================================================================
# FEED — queries secuenciales
# =========================================================================

@app.route('/feed/<owner_id>/rango', methods=['GET'])
def get_feed_rango(owner_id):
    try:
        desde = request.args.get("desde")
        hasta = request.args.get("hasta")
        return jsonify(repo.obtener_feed_rango(owner_id, desde, hasta)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/feed/<owner_id>/ultimos/<int:n>', methods=['GET'])
def get_feed_ultimos(owner_id, n):
    try:
        return jsonify(repo.obtener_feed_top_n(owner_id, n)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/feed/<owner_id>/tipo/<post_type>', methods=['GET'])
def get_feed_by_tipo(owner_id, post_type):
    try:
        return jsonify(repo.obtener_feed_por_tipo(owner_id, post_type)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/feed/autor/<author_id>', methods=['GET'])
def get_feed_by_autor(author_id):
    try:
        return jsonify(repo.obtener_feed_por_autor(author_id)), 200
    except ValueError:
        return jsonify({"error": "UUID inválido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================================================================
# MENSAJES — CRUD base
# =========================================================================

@app.route('/mensajes/<conv_id>', methods=['GET'])
def get_mensajes(conv_id):
    try:
        return jsonify(repo.obtener_mensajes(conv_id)), 200
    except ValueError:
        return jsonify({"error": "UUID inválido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/mensajes', methods=['POST'])
def crear_mensaje():
    try:
        body = request.json or {}
        message_id, sent_at = repo.insertar_mensaje(
            conversation_id=body["conversationId"],
            sent_at=body.get("sentAt") or datetime.now(timezone.utc),
            message_id=uuid4(),
            sender_id=body["senderId"],
            receiver_id=body.get("receiverId"),
            content=body.get("content"),
            is_read=False,
            media_url=body.get("mediaUrl"),
        )
        return jsonify({
            "status": "creado",
            "messageId": str(message_id),
            "sentAt": sent_at.isoformat(),
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/mensajes/leer', methods=['PUT'])
def marcar_leido():
    try:
        body = request.json or {}
        repo.marcar_leido(body["conversationId"], body["sentAt"], body["messageId"])
        return jsonify({"status": "marcado como leído"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/mensajes/<conv_id>/<sent_at>/<message_id>', methods=['DELETE'])
def eliminar_mensaje(conv_id, sent_at, message_id):
    try:
        repo.eliminar_mensaje(conv_id, sent_at, message_id)
        return jsonify({"status": "eliminado"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================================================================
# MENSAJES — queries secuenciales
# =========================================================================

@app.route('/mensajes/<conv_id>/rango', methods=['GET'])
def get_mensajes_rango(conv_id):
    try:
        desde = request.args.get("desde")
        hasta = request.args.get("hasta")
        return jsonify(repo.obtener_mensajes_rango(conv_id, desde, hasta)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/mensajes/<conv_id>/desde/<timestamp>', methods=['GET'])
def get_mensajes_desde(conv_id, timestamp):
    try:
        return jsonify(repo.obtener_mensajes_desde(conv_id, timestamp)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route('/mensajes/<conv_id>/no-leidos', methods=['GET'])
def get_mensajes_no_leidos(conv_id):
    try:
        return jsonify(repo.obtener_mensajes_no_leidos(conv_id)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/mensajes/sender/<sender_id>', methods=['GET'])
def get_mensajes_by_sender(sender_id):
    try:
        return jsonify(repo.obtener_mensajes_por_sender(sender_id)), 200
    except ValueError:
        return jsonify({"error": "UUID inválido"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("Iniciando API de la Red Social (Cassandra)...")
    app.run(debug=True, port=5002)
