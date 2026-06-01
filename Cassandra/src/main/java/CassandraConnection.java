import com.datastax.oss.driver.api.core.CqlSession;

import java.net.InetSocketAddress;

public class CassandraConnection {
    private static CqlSession instance;

    private CassandraConnection() {}

    public static CqlSession getInstance() {
        if (instance == null || instance.isClosed()) {
            instance = CqlSession.builder()
                    .addContactPoint(new InetSocketAddress("127.0.0.1", 9042))
                    .withLocalDatacenter("datacenter1")
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
