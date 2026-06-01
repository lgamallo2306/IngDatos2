import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import models.FeedEntry;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class FeedRepository {
    private final CqlSession session;
    private final PreparedStatement insertStmt;
    private final PreparedStatement insertByTypeStmt;
    private final PreparedStatement selectStmt;
    private final PreparedStatement deleteStmt;

    // Queries secuenciales sobre clustering key (created_at)
    private final PreparedStatement selectRangeStmt;
    private final PreparedStatement selectFromStmt;
    private final PreparedStatement selectLimitStmt;
    private final PreparedStatement selectByTypeStmt;

    public FeedRepository(CqlSession session) {
        this.session = session;

        this.insertStmt = session.prepare(
            "INSERT INTO social_network.feed_by_user " +
            "(owner_user_id, created_at, post_id, author_id, author_username, content_preview, post_type) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        this.insertByTypeStmt = session.prepare(
            "INSERT INTO social_network.feed_by_user_and_type " +
            "(owner_user_id, post_type, created_at, post_id, author_id, author_username, content_preview) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        this.selectStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_user WHERE owner_user_id = ? LIMIT 50"
        );
        this.deleteStmt = session.prepare(
            "DELETE FROM social_network.feed_by_user " +
            "WHERE owner_user_id = ? AND created_at = ? AND post_id = ?"
        );

        // Range scan: lectura secuencial entre dos timestamps dentro de la partición
        this.selectRangeStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_user " +
            "WHERE owner_user_id = ? AND created_at >= ? AND created_at <= ?"
        );

        // Prefix scan: todo lo que llegó a partir de cierto momento (cursor de paginación)
        this.selectFromStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_user " +
            "WHERE owner_user_id = ? AND created_at <= ? LIMIT ?"
        );

        // Top N más recientes
        this.selectLimitStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_user WHERE owner_user_id = ? LIMIT ?"
        );

        // Por tipo: usa la tabla secundaria con (owner_user_id, post_type) como partition key
        this.selectByTypeStmt = session.prepare(
            "SELECT * FROM social_network.feed_by_user_and_type " +
            "WHERE owner_user_id = ? AND post_type = ?"
        );
    }

    public void insert(FeedEntry entry) {
        session.execute(insertStmt.bind(
            entry.getOwnerUserId(),
            entry.getCreatedAt(),
            entry.getPostId(),
            entry.getAuthorId(),
            entry.getAuthorUsername(),
            entry.getContentPreview(),
            entry.getPostType()
        ));
        session.execute(insertByTypeStmt.bind(
            entry.getOwnerUserId(),
            entry.getPostType(),
            entry.getCreatedAt(),
            entry.getPostId(),
            entry.getAuthorId(),
            entry.getAuthorUsername(),
            entry.getContentPreview()
        ));
    }

    // --- CRUD base ---

    public List<FeedEntry> getByOwner(UUID ownerUserId) {
        ResultSet rs = session.execute(selectStmt.bind(ownerUserId));
        return toList(rs);
    }

    public void delete(UUID ownerUserId, Instant createdAt, UUID postId) {
        session.execute(deleteStmt.bind(ownerUserId, createdAt, postId));
    }

    // --- Queries secuenciales ---

    // Scan secuencial acotado: entradas entre dos fechas (rango sobre clustering key)
    public List<FeedEntry> getByOwnerInRange(UUID ownerUserId, Instant desde, Instant hasta) {
        ResultSet rs = session.execute(selectRangeStmt.bind(ownerUserId, desde, hasta));
        return toList(rs);
    }

    // Paginación por cursor: dado el created_at del último ítem visto, traer la siguiente página
    public List<FeedEntry> getPageBefore(UUID ownerUserId, Instant cursor, int limite) {
        ResultSet rs = session.execute(selectFromStmt.bind(ownerUserId, cursor, limite));
        return toList(rs);
    }

    // Top N: los N posts más recientes del feed
    public List<FeedEntry> getTopN(UUID ownerUserId, int n) {
        ResultSet rs = session.execute(selectLimitStmt.bind(ownerUserId, n));
        return toList(rs);
    }

    // Por tipo: usa tabla secundaria — sin ALLOW FILTERING
    public List<FeedEntry> getByOwnerAndType(UUID ownerUserId, String postType) {
        ResultSet rs = session.execute(selectByTypeStmt.bind(ownerUserId, postType));
        return toListFromType(rs, postType);
    }

    // --- helpers ---

    private List<FeedEntry> toList(ResultSet rs) {
        List<FeedEntry> list = new ArrayList<>();
        for (Row row : rs) list.add(rowToFeedEntry(row));
        return list;
    }

    private List<FeedEntry> toListFromType(ResultSet rs, String postType) {
        List<FeedEntry> list = new ArrayList<>();
        for (Row row : rs) {
            list.add(new FeedEntry(
                row.getUuid("owner_user_id"),
                row.getInstant("created_at"),
                row.getUuid("post_id"),
                row.getUuid("author_id"),
                row.getString("author_username"),
                row.getString("content_preview"),
                postType
            ));
        }
        return list;
    }

    private FeedEntry rowToFeedEntry(Row row) {
        return new FeedEntry(
            row.getUuid("owner_user_id"),
            row.getInstant("created_at"),
            row.getUuid("post_id"),
            row.getUuid("author_id"),
            row.getString("author_username"),
            row.getString("content_preview"),
            row.getString("post_type")
        );
    }
}
