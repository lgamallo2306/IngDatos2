import com.datastax.oss.driver.api.core.CqlSession;
import java.net.InetSocketAddress;

public class Main {
    public static void main(String[] args) {
        System.out.println("hola");
        CqlSession session = CqlSession.builder()
                .addContactPoint(new InetSocketAddress("127.0.0.1", 9042))
                .withLocalDatacenter("datacenter1")
                .build();
    }
}
