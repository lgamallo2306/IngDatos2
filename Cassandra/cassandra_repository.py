import sys
import types
from datetime import datetime, timezone
from uuid import UUID, uuid4

# Stub para cassandra-driver en Python 3.12 (asyncore fue eliminado)
_stub = types.ModuleType("asyncore")
_stub.dispatcher = object
sys.modules.setdefault("asyncore", _stub)

from cassandra.cluster import Cluster
from cassandra.io.asyncioreactor import AsyncioConnection


def _parse_dt(s):
    if isinstance(s, datetime):
        return s
    return datetime.fromisoformat(str(s).replace("Z", "+00:00"))


def _feed_row(r):
    return {
        "ownerUserId":    str(r.owner_user_id),
        "createdAt":      r.created_at.isoformat() if r.created_at else None,
        "postId":         str(r.post_id),
        "authorId":       str(r.author_id) if r.author_id else None,
        "authorUsername": r.author_username,
        "contentPreview": r.content_preview,
        "postType":       r.post_type,
    }


def _msg_row(r):
    return {
        "conversationId": str(r.conversation_id),
        "sentAt":         r.sent_at.isoformat() if r.sent_at else None,
        "messageId":      str(r.message_id),
        "senderId":       str(r.sender_id) if r.sender_id else None,
        "receiverId":     str(r.receiver_id) if r.receiver_id else None,
        "content":        r.content,
        "read":           bool(r.is_read),
        "mediaUrl":       r.media_url,
    }


class CassandraRepository:

    def __init__(self, host="127.0.0.1", port=9042):
        self.cluster = Cluster([host], port=port, connection_class=AsyncioConnection)
        self.session = self.cluster.connect()
        self._crear_esquema()

    def close(self):
        self.cluster.shutdown()

    # =========================================================================
    # ESQUEMA
    # =========================================================================

    def _crear_esquema(self):
        s = self.session
        s.execute(
            "CREATE KEYSPACE IF NOT EXISTS social_network "
            "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed ("
            "  owner_user_id UUID, created_at TIMESTAMP, post_id UUID,"
            "  author_id UUID, author_username TEXT, content_preview TEXT, post_type TEXT,"
            "  PRIMARY KEY ((owner_user_id), created_at, post_id)"
            ") WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_type ("
            "  owner_user_id UUID, post_type TEXT, created_at TIMESTAMP, post_id UUID,"
            "  author_id UUID, content_preview TEXT,"
            "  PRIMARY KEY ((owner_user_id), post_type, created_at, post_id)"
            ") WITH CLUSTERING ORDER BY (post_type ASC, created_at DESC, post_id ASC)"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_author ("
            "  author_id UUID, created_at TIMESTAMP, post_id UUID,"
            "  owner_user_id UUID, content_preview TEXT, post_type TEXT,"
            "  PRIMARY KEY ((author_id), created_at, post_id)"
            ") WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages ("
            "  conversation_id UUID, sent_at TIMESTAMP, message_id UUID,"
            "  sender_id UUID, receiver_id UUID, content TEXT, is_read BOOLEAN, media_url TEXT,"
            "  PRIMARY KEY ((conversation_id), sent_at, message_id)"
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages_unread ("
            "  conversation_id UUID, sent_at TIMESTAMP, message_id UUID,"
            "  sender_id UUID, content TEXT,"
            "  PRIMARY KEY ((conversation_id), sent_at, message_id)"
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        )
        s.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages_by_sender ("
            "  sender_id UUID, sent_at TIMESTAMP, message_id UUID,"
            "  conversation_id UUID, receiver_id UUID, content TEXT,"
            "  PRIMARY KEY ((sender_id), sent_at, message_id)"
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        )
        print("[CassandraRepository] Keyspace y tablas listas.")

    # =========================================================================
    # FEED
    # =========================================================================

    def insertar_feed(self, owner_user_id, created_at, post_id, author_id,
                      author_username, content_preview, post_type):
        oid = UUID(str(owner_user_id))
        pid = UUID(str(post_id))
        aid = UUID(str(author_id))
        cat = _parse_dt(created_at)
        self.session.execute(
            "INSERT INTO social_network.feed "
            "(owner_user_id, created_at, post_id, author_id, author_username, content_preview, post_type) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            [oid, cat, pid, aid, author_username, content_preview, post_type]
        )
        self.session.execute(
            "INSERT INTO social_network.feed_by_type "
            "(owner_user_id, post_type, created_at, post_id, author_id, content_preview) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            [oid, post_type, cat, pid, aid, content_preview]
        )
        self.session.execute(
            "INSERT INTO social_network.feed_by_author "
            "(author_id, created_at, post_id, owner_user_id, content_preview, post_type) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            [aid, cat, pid, oid, content_preview, post_type]
        )

    def obtener_feed(self, owner_id):
        rows = self.session.execute(
            "SELECT * FROM social_network.feed WHERE owner_user_id = %s LIMIT 50",
            [UUID(str(owner_id))]
        )
        return [_feed_row(r) for r in rows]

    def eliminar_feed(self, owner_id, created_at, post_id):
        self.session.execute(
            "DELETE FROM social_network.feed WHERE owner_user_id = %s AND created_at = %s AND post_id = %s",
            [UUID(str(owner_id)), _parse_dt(created_at), UUID(str(post_id))]
        )

    def obtener_feed_rango(self, owner_id, desde, hasta):
        rows = self.session.execute(
            "SELECT * FROM social_network.feed WHERE owner_user_id = %s AND created_at >= %s AND created_at <= %s",
            [UUID(str(owner_id)), _parse_dt(desde), _parse_dt(hasta)]
        )
        return [_feed_row(r) for r in rows]

    def obtener_feed_top_n(self, owner_id, n):
        rows = self.session.execute(
            "SELECT * FROM social_network.feed WHERE owner_user_id = %s LIMIT %s",
            [UUID(str(owner_id)), int(n)]
        )
        return [_feed_row(r) for r in rows]

    def obtener_feed_por_tipo(self, owner_id, post_type):
        rows = self.session.execute(
            "SELECT * FROM social_network.feed_by_type WHERE owner_user_id = %s AND post_type = %s",
            [UUID(str(owner_id)), post_type]
        )
        return [{
            "ownerUserId": str(r.owner_user_id), "createdAt": r.created_at.isoformat() if r.created_at else None,
            "postId": str(r.post_id), "authorId": str(r.author_id) if r.author_id else None,
            "authorUsername": None, "contentPreview": r.content_preview, "postType": post_type,
        } for r in rows]

    def obtener_feed_por_autor(self, author_id):
        aid = UUID(str(author_id))
        rows = self.session.execute(
            "SELECT * FROM social_network.feed_by_author WHERE author_id = %s",
            [aid]
        )
        return [{
            "ownerUserId": str(r.owner_user_id) if r.owner_user_id else None,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
            "postId": str(r.post_id), "authorId": str(aid),
            "authorUsername": None, "contentPreview": r.content_preview, "postType": r.post_type,
        } for r in rows]

    # =========================================================================
    # MENSAJES
    # =========================================================================

    def insertar_mensaje(self, conversation_id, sent_at, message_id, sender_id,
                         receiver_id, content, is_read=False, media_url=None):
        cid = UUID(str(conversation_id))
        mid = UUID(str(message_id)) if message_id else uuid4()
        sid = UUID(str(sender_id))
        rid = UUID(str(receiver_id)) if receiver_id else None
        sat = _parse_dt(sent_at)
        self.session.execute(
            "INSERT INTO social_network.messages "
            "(conversation_id, sent_at, message_id, sender_id, receiver_id, content, is_read, media_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            [cid, sat, mid, sid, rid, content, is_read, media_url]
        )
        if not is_read:
            self.session.execute(
                "INSERT INTO social_network.messages_unread "
                "(conversation_id, sent_at, message_id, sender_id, content) VALUES (%s, %s, %s, %s, %s)",
                [cid, sat, mid, sid, content]
            )
        self.session.execute(
            "INSERT INTO social_network.messages_by_sender "
            "(sender_id, sent_at, message_id, conversation_id, receiver_id, content) VALUES (%s, %s, %s, %s, %s, %s)",
            [sid, sat, mid, cid, rid, content]
        )
        return mid, sat

    def obtener_mensajes(self, conv_id):
        rows = self.session.execute(
            "SELECT * FROM social_network.messages WHERE conversation_id = %s",
            [UUID(str(conv_id))]
        )
        return [_msg_row(r) for r in rows]

    def marcar_leido(self, conv_id, sent_at, msg_id):
        cid, sat, mid = UUID(str(conv_id)), _parse_dt(sent_at), UUID(str(msg_id))
        row = self.session.execute(
            "SELECT * FROM social_network.messages WHERE conversation_id = %s AND sent_at = %s AND message_id = %s",
            [cid, sat, mid]
        ).one()
        if row:
            self.session.execute(
                "INSERT INTO social_network.messages "
                "(conversation_id, sent_at, message_id, sender_id, receiver_id, content, is_read, media_url) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
                [cid, sat, mid, row.sender_id, row.receiver_id, row.content, True, row.media_url]
            )
            self.session.execute(
                "DELETE FROM social_network.messages_unread "
                "WHERE conversation_id = %s AND sent_at = %s AND message_id = %s",
                [cid, sat, mid]
            )
            return True
        return False

    def eliminar_mensaje(self, conv_id, sent_at, msg_id):
        cid, sat, mid = UUID(str(conv_id)), _parse_dt(sent_at), UUID(str(msg_id))
        self.session.execute(
            "DELETE FROM social_network.messages WHERE conversation_id = %s AND sent_at = %s AND message_id = %s",
            [cid, sat, mid]
        )
        self.session.execute(
            "DELETE FROM social_network.messages_unread WHERE conversation_id = %s AND sent_at = %s AND message_id = %s",
            [cid, sat, mid]
        )

    def obtener_mensajes_rango(self, conv_id, desde, hasta):
        rows = self.session.execute(
            "SELECT * FROM social_network.messages WHERE conversation_id = %s AND sent_at >= %s AND sent_at <= %s",
            [UUID(str(conv_id)), _parse_dt(desde), _parse_dt(hasta)]
        )
        return [_msg_row(r) for r in rows]

    def obtener_mensajes_desde(self, conv_id, desde):
        rows = self.session.execute(
            "SELECT * FROM social_network.messages WHERE conversation_id = %s AND sent_at >= %s",
            [UUID(str(conv_id)), _parse_dt(desde)]
        )
        return [_msg_row(r) for r in rows]

    def obtener_mensajes_no_leidos(self, conv_id):
        rows = self.session.execute(
            "SELECT * FROM social_network.messages_unread WHERE conversation_id = %s",
            [UUID(str(conv_id))]
        )
        return [{
            "conversationId": str(r.conversation_id), "sentAt": r.sent_at.isoformat() if r.sent_at else None,
            "messageId": str(r.message_id), "senderId": str(r.sender_id) if r.sender_id else None,
            "receiverId": None, "content": r.content, "read": False, "mediaUrl": None,
        } for r in rows]

    def obtener_mensajes_por_sender(self, sender_id):
        sid = UUID(str(sender_id))
        rows = self.session.execute(
            "SELECT * FROM social_network.messages_by_sender WHERE sender_id = %s",
            [sid]
        )
        return [{
            "conversationId": str(r.conversation_id) if r.conversation_id else None,
            "sentAt": r.sent_at.isoformat() if r.sent_at else None,
            "messageId": str(r.message_id), "senderId": str(sid),
            "receiverId": str(r.receiver_id) if r.receiver_id else None,
            "content": r.content, "read": False, "mediaUrl": None,
        } for r in rows]
