import com.datastax.oss.driver.api.core.CqlSession;

public class SchemaInitializer {

    public static void initialize(CqlSession session) {
        session.execute(
            "CREATE KEYSPACE IF NOT EXISTS social_network " +
            "WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
        );

        // Tabla principal de feed: particionada por usuario, ordenada por fecha DESC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_user (" +
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

        // Tabla secundaria: misma data, particionada por (usuario, tipo) para
        // poder filtrar por post_type sin ALLOW FILTERING — patrón "una tabla por query"
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.feed_by_user_and_type (" +
            "  owner_user_id   UUID," +
            "  post_type       TEXT," +
            "  created_at      TIMESTAMP," +
            "  post_id         UUID," +
            "  author_id       UUID," +
            "  author_username TEXT," +
            "  content_preview TEXT," +
            "  PRIMARY KEY ((owner_user_id, post_type), created_at, post_id)" +
            ") WITH CLUSTERING ORDER BY (created_at DESC, post_id ASC)"
        );

        // Mensajes: particionados por conversación, ordenados por tiempo ASC
        session.execute(
            "CREATE TABLE IF NOT EXISTS social_network.messages_by_conversation (" +
            "  conversation_id UUID," +
            "  sent_at         TIMESTAMP," +
            "  message_id      UUID," +
            "  sender_id       UUID," +
            "  receiver_id     UUID," +
            "  content         TEXT," +
            "  is_read         BOOLEAN," +
            "  media_url       TEXT," +
            "  PRIMARY KEY ((conversation_id), sent_at, message_id)" +
            ") WITH CLUSTERING ORDER BY (sent_at ASC, message_id ASC)"
        );

        System.out.println("[SchemaInitializer] Keyspace y tablas listas.");
    }
}
