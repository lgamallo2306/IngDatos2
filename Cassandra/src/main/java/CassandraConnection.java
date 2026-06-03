import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.DefaultDriverOption;
import com.datastax.oss.driver.api.core.config.DriverConfigLoader;

import java.net.InetSocketAddress;
import java.time.Duration;

public class CassandraConnection {
    private static CqlSession instance;

    private CassandraConnection() {}

    public static CqlSession getInstance() {
        if (instance == null || instance.isClosed()) {
            instance = CqlSession.builder()
                    .addContactPoint(new InetSocketAddress("127.0.0.1", 9042))
                    .withLocalDatacenter("datacenter1")
                    .withConfigLoader(DriverConfigLoader.programmaticBuilder()
                            // DDL (CREATE TABLE/KEYSPACE) necesita schema agreement;
                            // 30s cubre incluso arranques lentos de Cassandra en local.
                            .withDuration(DefaultDriverOption.REQUEST_TIMEOUT, Duration.ofSeconds(30))
                            .build())
                    .build();
        }
        return instance;
    }

    public static void close() {
        if (instance != null && !instance.isClosed()) {
            instance.close();
        }
    }
}
