import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import models.Message;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class MessageRepository {
    private final CqlSession session;
    private final PreparedStatement insertStmt;
    private final PreparedStatement selectStmt;
    private final PreparedStatement deleteStmt;

    // Queries secuenciales sobre clustering key (sent_at)
    private final PreparedStatement selectRangeStmt;
    private final PreparedStatement selectFromStmt;
    private final PreparedStatement selectUnreadStmt;

    public MessageRepository(CqlSession session) {
        this.session = session;

        this.insertStmt = session.prepare(
            "INSERT INTO social_network.messages_by_conversation " +
            "(conversation_id, sent_at, message_id, sender_id, receiver_id, content, is_read, media_url) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        this.selectStmt = session.prepare(
            "SELECT * FROM social_network.messages_by_conversation WHERE conversation_id = ?"
        );
        this.deleteStmt = session.prepare(
            "DELETE FROM social_network.messages_by_conversation " +
            "WHERE conversation_id = ? AND sent_at = ? AND message_id = ?"
        );

        // Range scan: mensajes entre dos timestamps (lectura secuencial dentro de la partición)
        this.selectRangeStmt = session.prepare(
            "SELECT * FROM social_network.messages_by_conversation " +
            "WHERE conversation_id = ? AND sent_at >= ? AND sent_at <= ?"
        );

        // Desde un timestamp: mensajes nuevos desde la última vez que se revisó
        this.selectFromStmt = session.prepare(
            "SELECT * FROM social_network.messages_by_conversation " +
            "WHERE conversation_id = ? AND sent_at >= ?"
        );

        // No leídos: ALLOW FILTERING necesario porque is_read no es parte del PK.
        // Apropiado solo para conversaciones pequeñas; en producción se usaría una tabla separada.
        this.selectUnreadStmt = session.prepare(
            "SELECT * FROM social_network.messages_by_conversation " +
            "WHERE conversation_id = ? AND is_read = false ALLOW FILTERING"
        );
    }

    public void insert(Message message) {
        session.execute(insertStmt.bind(
            message.getConversationId(),
            message.getSentAt(),
            message.getMessageId(),
            message.getSenderId(),
            message.getReceiverId(),
            message.getContent(),
            message.isRead(),
            message.getMediaUrl()
        ));
    }

    // --- CRUD base ---

    public List<Message> getByConversation(UUID conversationId) {
        ResultSet rs = session.execute(selectStmt.bind(conversationId));
        return toList(rs);
    }

    public void markAsRead(UUID conversationId, Instant sentAt, UUID messageId) {
        Row row = session.execute(
            session.prepare("SELECT * FROM social_network.messages_by_conversation " +
                "WHERE conversation_id = ? AND sent_at = ? AND message_id = ?")
                .bind(conversationId, sentAt, messageId)
        ).one();

        if (row != null) {
            session.execute(insertStmt.bind(
                conversationId, sentAt, messageId,
                row.getUuid("sender_id"),
                row.getUuid("receiver_id"),
                row.getString("content"),
                true,
                row.getString("media_url")
            ));
        }
    }

    public void delete(UUID conversationId, Instant sentAt, UUID messageId) {
        session.execute(deleteStmt.bind(conversationId, sentAt, messageId));
    }

    // --- Queries secuenciales ---

    // Rango de tiempo: scan secuencial entre sent_at >= desde y sent_at <= hasta
    public List<Message> getByConversationInRange(UUID conversationId, Instant desde, Instant hasta) {
        ResultSet rs = session.execute(selectRangeStmt.bind(conversationId, desde, hasta));
        return toList(rs);
    }

    // Desde un timestamp: mensajes nuevos desde la última sincronización (polling eficiente)
    public List<Message> getByConversationFrom(UUID conversationId, Instant desde) {
        ResultSet rs = session.execute(selectFromStmt.bind(conversationId, desde));
        return toList(rs);
    }

    // No leídos dentro de una conversación (ALLOW FILTERING — solo sobre la partición ya filtrada)
    public List<Message> getUnread(UUID conversationId) {
        ResultSet rs = session.execute(selectUnreadStmt.bind(conversationId));
        return toList(rs);
    }

    // --- helpers ---

    private List<Message> toList(ResultSet rs) {
        List<Message> list = new ArrayList<>();
        for (Row row : rs) list.add(rowToMessage(row));
        return list;
    }

    private Message rowToMessage(Row row) {
        return new Message(
            row.getUuid("conversation_id"),
            row.getInstant("sent_at"),
            row.getUuid("message_id"),
            row.getUuid("sender_id"),
            row.getUuid("receiver_id"),
            row.getString("content"),
            row.getBoolean("is_read"),
            row.getString("media_url")
        );
    }
}
