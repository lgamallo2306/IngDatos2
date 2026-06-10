import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import models.FeedEntry;
import models.Message;

import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class CassandraService {
    private final CqlSession session;

    // feed
    private final PreparedStatement feedInsertStmt;
    private final PreparedStatement feedInsertByTypeStmt;
    private final PreparedStatement feedInsertByAuthorStmt;
    private final PreparedStatement feedSelectStmt;
    private final PreparedStatement feedDeleteStmt;
    private final PreparedStatement feedSelectRangeStmt;
    private final PreparedStatement feedSelectLimitStmt;
    private final PreparedStatement feedSelectByTypeStmt;
    private final PreparedStatement feedSelectByAuthorStmt;

    // messages
    private final PreparedStatement msgInsertStmt;
    private final PreparedStatement msgInsertUnreadStmt;
    private final PreparedStatement msgInsertBySenderStmt;
    private final PreparedStatement msgSelectStmt;
    private final PreparedStatement msgDeleteStmt;
    private final PreparedStatement msgDeleteUnreadStmt;
    private final PreparedStatement msgSelectRangeStmt;
    private final PreparedStatement msgSelectFromStmt;
    private final PreparedStatement msgSelectUnreadStmt;
    private final PreparedStatement msgSelectBySenderStmt;
    private final PreparedStatement msgSelectOneStmt;

    public CassandraService() {
        this.session = CqlSession.builder()
                .addContactPoint(new InetSocketAddress("127.0.0.1", 9042))
                .withLocalDatacenter("datacenter1")
                .build();
        initializeSchema();

        // ── feed ──────────────────────────────────────────────────────────────
        this.feedInsertStmt = session.prepare(
            "INSERT INTO social_network.feed " +
            "(owner_user_id, created_at, post_id, author_id, author_username, content_preview, post_type) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        this.feedInsertByTypeStmt = session.prepare(
            "INSERT INTO social_network.feed_by_type " +
            "(owner_user_id, post_type, created_at, post_id, author_id, content_preview) " +
            "VALUES (?, ?, ?, ?, ?, ?)"
        );
        this.feedInsertByAuthorStmt = session.prepare(
            "INSERT INTO social_network.feed_by_author " +
            "(author_id, created_at, post_id, owner_user_id, content_preview, post_type) " +
            "VALUES (?, ?, ?, ?, ?, ?)"
        );
        this.feedSelectStmt = session.prepare(
            "SELECT * FROM social_network.feed WHERE owner_user_id = ? LIMIT 50"
        );
        this.feedDeleteStmt = session.prepare(
            "DELETE FROM social_network.feed WHERE owner_user_id = ? AND created_at = ? AND post_id = ?"
        );
        this.feedSelectRangeStmt = session.prepare(
            "SELECT * FROM social_network.feed " +
            "WHERE owner_user_id = ? AND created_at >= ? AND created_at <= ?"
        );
        this.feedSelectLimitStmt = session.prepare(
            "SELECT * FROM social_network.feed WHERE owner_user_id = ? LIMIT ?"
        );
        this.feedSelectByTypeStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_type WHERE owner_user_id = ? AND post_type = ?"
        );
        this.feedSelectByAuthorStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_author WHERE author_id = ?"
        );

        // ── messages ──────────────────────────────────────────────────────────
        this.msgInsertStmt = session.prepare(
            "INSERT INTO social_network.messages " +
            "(conversation_id, sent_at, message_id, sender_id, receiver_id, content, is_read, media_url) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        this.msgInsertUnreadStmt = session.prepare(
            "INSERT INTO social_network.messages_unread " +
            "(conversation_id, sent_at, message_id, sender_id, content) " +
            "VALUES (?, ?, ?, ?, ?)"
        );
        this.msgInsertBySenderStmt = session.prepare(
            "INSERT INTO social_network.messages_by_sender " +
            "(sender_id, sent_at, message_id, conversation_id, receiver_id, content) " +
            "VALUES (?, ?, ?, ?, ?, ?)"
        );
        this.msgSelectStmt = session.prepare(
            "SELECT * FROM social_network.messages WHERE conversation_id = ?"
        );
        this.msgDeleteStmt = session.prepare(
            "DELETE FROM social_network.messages WHERE conversation_id = ? AND sent_at = ? AND message_id = ?"
        );
        this.msgDeleteUnreadStmt = session.prepare(
            "DELETE FROM social_network.messages_unread " +
            "WHERE conversation_id = ? AND sent_at = ? AND message_id = ?"
        );
        this.msgSelectRangeStmt = session.prepare(
            "SELECT * FROM social_network.messages " +
            "WHERE conversation_id = ? AND sent_at >= ? AND sent_at <= ?"
        );
        this.msgSelectFromStmt = session.prepare(
            "SELECT * FROM social_network.messages WHERE conversation_id = ? AND sent_at >= ?"
        );
        this.msgSelectUnreadStmt = session.prepare(
            "SELECT * FROM social_network.messages_unread WHERE conversation_id = ?"
        );
        this.msgSelectBySenderStmt = session.prepare(
            "SELECT * FROM social_network.messages_by_sender WHERE sender_id = ?"
        );
        this.msgSelectOneStmt = session.prepare(
            "SELECT * FROM social_network.messages " +
            "WHERE conversation_id = ? AND sent_at = ? AND message_id = ?"
        );
    }

    public void close() {
        if (!session.isClosed()) session.close();
    }

    private void initializeSchema() {
        session.execute(
            "CREATE KEYSPACE IF NOT EXISTS social_network " +
            "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
        );
        // Q1/Q2: feed principal — PK: owner_user_id / clustering: created_at DESC, post_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed (" +
            "  owner_user_id   UUID," +
            "  created_at      TIMESTAMP," +
            "  post_id         UUID," +
            "  author_id       UUID," +
            "  author_username TEXT," +
            "  content_preview TEXT," +
            "  post_type       TEXT," +
            "  PRIMARY KEY ((owner_user_id), created_at, post_id)" +
            ") WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)"
        );
        // Q3: feed_by_type — PK: owner_user_id / clustering: post_type ASC, created_at DESC, post_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_type (" +
            "  owner_user_id   UUID," +
            "  post_type       TEXT," +
            "  created_at      TIMESTAMP," +
            "  post_id         UUID," +
            "  author_id       UUID," +
            "  content_preview TEXT," +
            "  PRIMARY KEY ((owner_user_id), post_type, created_at, post_id)" +
            ") WITH CLUSTERING ORDER BY (post_type ASC, created_at DESC, post_id ASC)"
        );
        // Q4: feed_by_author — PK: author_id / clustering: created_at DESC, post_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_author (" +
            "  author_id       UUID," +
            "  created_at      TIMESTAMP," +
            "  post_id         UUID," +
            "  owner_user_id   UUID," +
            "  content_preview TEXT," +
            "  post_type       TEXT," +
            "  PRIMARY KEY ((author_id), created_at, post_id)" +
            ") WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)"
        );
        // Q5/Q6: messages — PK: conversation_id / clustering: sent_at DESC, message_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages (" +
            "  conversation_id UUID," +
            "  sent_at         TIMESTAMP," +
            "  message_id      UUID," +
            "  sender_id       UUID," +
            "  receiver_id     UUID," +
            "  content         TEXT," +
            "  is_read         BOOLEAN," +
            "  media_url       TEXT," +
            "  PRIMARY KEY ((conversation_id), sent_at, message_id)" +
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        );
        // Q7: messages_unread — PK: conversation_id / clustering: sent_at DESC, message_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages_unread (" +
            "  conversation_id UUID," +
            "  sent_at         TIMESTAMP," +
            "  message_id      UUID," +
            "  sender_id       UUID," +
            "  content         TEXT," +
            "  PRIMARY KEY ((conversation_id), sent_at, message_id)" +
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        );
        // Q8: messages_by_sender — PK: sender_id / clustering: sent_at DESC, message_id ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages_by_sender (" +
            "  sender_id       UUID," +
            "  sent_at         TIMESTAMP," +
            "  message_id      UUID," +
            "  conversation_id UUID," +
            "  receiver_id     UUID," +
            "  content         TEXT," +
            "  PRIMARY KEY ((sender_id), sent_at, message_id)" +
            ") WITH CLUSTERING ORDER BY (sent_at DESC, message_id ASC)"
        );
        System.out.println("[CassandraService] Keyspace y tablas listas.");
    }

    // =========================================================================
    // FEED
    // =========================================================================

    // Q2 → también dispara Q3 y Q4
    public void insertFeed(FeedEntry entry) {
        session.execute(feedInsertStmt.bind(
            entry.getOwnerUserId(), entry.getCreatedAt(), entry.getPostId(),
            entry.getAuthorId(), entry.getAuthorUsername(),
            entry.getContentPreview(), entry.getPostType()
        ));
        session.execute(feedInsertByTypeStmt.bind(
            entry.getOwnerUserId(), entry.getPostType(), entry.getCreatedAt(),
            entry.getPostId(), entry.getAuthorId(), entry.getContentPreview()
        ));
        session.execute(feedInsertByAuthorStmt.bind(
            entry.getAuthorId(), entry.getCreatedAt(), entry.getPostId(),
            entry.getOwnerUserId(), entry.getContentPreview(), entry.getPostType()
        ));
    }

    // Q1
    public List<FeedEntry> getFeed(UUID ownerId) {
        return feedList(session.execute(feedSelectStmt.bind(ownerId)));
    }

    public void deleteFeed(UUID ownerId, Instant createdAt, UUID postId) {
        session.execute(feedDeleteStmt.bind(ownerId, createdAt, postId));
    }

    public List<FeedEntry> getFeedRange(UUID ownerId, Instant desde, Instant hasta) {
        return feedList(session.execute(feedSelectRangeStmt.bind(ownerId, desde, hasta)));
    }

    public List<FeedEntry> getFeedTopN(UUID ownerId, int n) {
        return feedList(session.execute(feedSelectLimitStmt.bind(ownerId, n)));
    }

    // Q3 — consulta feed_by_type
    public List<FeedEntry> getFeedByType(UUID ownerId, String postType) {
        ResultSet rs = session.execute(feedSelectByTypeStmt.bind(ownerId, postType));
        List<FeedEntry> list = new ArrayList<>();
        for (Row row : rs) list.add(new FeedEntry(
            row.getUuid("owner_user_id"), row.getInstant("created_at"),
            row.getUuid("post_id"), row.getUuid("author_id"),
            null, row.getString("content_preview"), postType
        ));
        return list;
    }

    // Q4 — consulta feed_by_author
    public List<FeedEntry> getFeedByAuthor(UUID authorId) {
        ResultSet rs = session.execute(feedSelectByAuthorStmt.bind(authorId));
        List<FeedEntry> list = new ArrayList<>();
        for (Row row : rs) list.add(new FeedEntry(
            row.getUuid("owner_user_id"), row.getInstant("created_at"),
            row.getUuid("post_id"), authorId,
            null, row.getString("content_preview"), row.getString("post_type")
        ));
        return list;
    }

    // =========================================================================
    // MENSAJES
    // =========================================================================

    // Q6 → también dispara Q7 (si no leído) y Q8
    public void insertMessage(Message msg) {
        session.execute(msgInsertStmt.bind(
            msg.getConversationId(), msg.getSentAt(), msg.getMessageId(),
            msg.getSenderId(), msg.getReceiverId(),
            msg.getContent(), msg.isRead(), msg.getMediaUrl()
        ));
        if (!msg.isRead()) {
            session.execute(msgInsertUnreadStmt.bind(
                msg.getConversationId(), msg.getSentAt(), msg.getMessageId(),
                msg.getSenderId(), msg.getContent()
            ));
        }
        session.execute(msgInsertBySenderStmt.bind(
            msg.getSenderId(), msg.getSentAt(), msg.getMessageId(),
            msg.getConversationId(), msg.getReceiverId(), msg.getContent()
        ));
    }

    // Q5
    public List<Message> getMessages(UUID convId) {
        return msgList(session.execute(msgSelectStmt.bind(convId)));
    }

    public void markAsRead(UUID convId, Instant sentAt, UUID msgId) {
        Row row = session.execute(msgSelectOneStmt.bind(convId, sentAt, msgId)).one();
        if (row != null) {
            session.execute(msgInsertStmt.bind(
                convId, sentAt, msgId,
                row.getUuid("sender_id"), row.getUuid("receiver_id"),
                row.getString("content"), true, row.getString("media_url")
            ));
            session.execute(msgDeleteUnreadStmt.bind(convId, sentAt, msgId));
        }
    }

    public void deleteMessage(UUID convId, Instant sentAt, UUID msgId) {
        session.execute(msgDeleteStmt.bind(convId, sentAt, msgId));
        session.execute(msgDeleteUnreadStmt.bind(convId, sentAt, msgId));
    }

    public List<Message> getMessagesRange(UUID convId, Instant desde, Instant hasta) {
        return msgList(session.execute(msgSelectRangeStmt.bind(convId, desde, hasta)));
    }

    public List<Message> getMessagesFrom(UUID convId, Instant desde) {
        return msgList(session.execute(msgSelectFromStmt.bind(convId, desde)));
    }

    // Q7 — consulta messages_unread (tabla dedicada, sin ALLOW FILTERING)
    public List<Message> getUnreadMessages(UUID convId) {
        ResultSet rs = session.execute(msgSelectUnreadStmt.bind(convId));
        List<Message> list = new ArrayList<>();
        for (Row row : rs) list.add(new Message(
            row.getUuid("conversation_id"), row.getInstant("sent_at"),
            row.getUuid("message_id"), row.getUuid("sender_id"),
            null, row.getString("content"), false, null
        ));
        return list;
    }

    // Q8 — consulta messages_by_sender
    public List<Message> getMessagesBySender(UUID senderId) {
        ResultSet rs = session.execute(msgSelectBySenderStmt.bind(senderId));
        List<Message> list = new ArrayList<>();
        for (Row row : rs) list.add(new Message(
            row.getUuid("conversation_id"), row.getInstant("sent_at"),
            row.getUuid("message_id"), senderId,
            row.getUuid("receiver_id"), row.getString("content"), false, null
        ));
        return list;
    }

    // =========================================================================
    // helpers
    // =========================================================================

    private List<FeedEntry> feedList(ResultSet rs) {
        List<FeedEntry> list = new ArrayList<>();
        for (Row row : rs) list.add(new FeedEntry(
            row.getUuid("owner_user_id"), row.getInstant("created_at"),
            row.getUuid("post_id"), row.getUuid("author_id"),
            row.getString("author_username"), row.getString("content_preview"),
            row.getString("post_type")
        ));
        return list;
    }

    private List<Message> msgList(ResultSet rs) {
        List<Message> list = new ArrayList<>();
        for (Row row : rs) list.add(new Message(
            row.getUuid("conversation_id"), row.getInstant("sent_at"),
            row.getUuid("message_id"), row.getUuid("sender_id"),
            row.getUuid("receiver_id"), row.getString("content"),
            row.getBoolean("is_read"), row.getString("media_url")
        ));
        return list;
    }
}
