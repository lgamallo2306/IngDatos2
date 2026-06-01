import com.datastax.oss.driver.api.core.CqlSession;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.Javalin;
import io.javalin.http.Context;
import models.FeedEntry;
import models.Message;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class Main {

    private static FeedRepository feedRepo;
    private static MessageRepository messageRepo;
    private static final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static final String DATASET_PATH = "../datasetMediano.json";

    public static void main(String[] args) {
        CqlSession session = CassandraConnection.getInstance();
        SchemaInitializer.initialize(session);

        feedRepo = new FeedRepository(session);
        messageRepo = new MessageRepository(session);

        Javalin app = Javalin.create(config -> {
            config.bundledPlugins.enableCors(cors -> cors.addRule(it -> it.anyHost()));
        }).start(7000);

        // Cargar dataset
        app.post("/cargar", Main::cargarDataset);

        // Feed — CRUD base
        app.get("/feed/{ownerId}", Main::getFeed);
        app.post("/feed", Main::crearFeedEntry);
        app.delete("/feed/{ownerId}/{createdAt}/{postId}", Main::eliminarFeedEntry);

        // Feed — queries secuenciales
        app.get("/feed/{ownerId}/rango", Main::getFeedRango);           // ?desde=&hasta=
        app.get("/feed/{ownerId}/pagina", Main::getFeedPagina);         // ?cursor=&limite=
        app.get("/feed/{ownerId}/ultimos/{n}", Main::getFeedUltimos);   // top N
        app.get("/feed/{ownerId}/tipo/{postType}", Main::getFeedByTipo); // tabla secundaria

        // Mensajes — CRUD base
        app.get("/mensajes/{conversationId}", Main::getMensajes);
        app.post("/mensajes", Main::crearMensaje);
        app.put("/mensajes/leer", Main::marcarLeido);
        app.delete("/mensajes/{convId}/{sentAt}/{messageId}", Main::eliminarMensaje);

        // Mensajes — queries secuenciales
        app.get("/mensajes/{conversationId}/rango", Main::getMensajesRango);   // ?desde=&hasta=
        app.get("/mensajes/{conversationId}/desde/{timestamp}", Main::getMensajesDesde);
        app.get("/mensajes/{conversationId}/no-leidos", Main::getMensajesNoLeidos);

        System.out.println("[Main] Servidor iniciado en http://localhost:7000");

        Runtime.getRuntime().addShutdownHook(new Thread(CassandraConnection::close));
    }

    // =========================================================================
    // CARGA
    // =========================================================================

    private static void cargarDataset(Context ctx) {
        try {
            DataLoader loader = new DataLoader(feedRepo, messageRepo);
            int[] counts = loader.loadFromFile(DATASET_PATH);
            ctx.json(Map.of(
                "status", "ok",
                "feed_insertados", counts[0],
                "mensajes_insertados", counts[1]
            ));
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // FEED — CRUD base
    // =========================================================================

    // GET /feed/{ownerId}  — últimos 50
    private static void getFeed(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            ctx.result(mapper.writeValueAsString(feedRepo.getByOwner(ownerId)));
            ctx.contentType("application/json");
        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of("error", "UUID inválido"));
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }

    // POST /feed  body: { ownerUserId, postId, authorId, authorUsername, contentPreview, postType, createdAt? }
    private static void crearFeedEntry(Context ctx) {
        try {
            Map<?, ?> body = mapper.readValue(ctx.body(), Map.class);
            FeedEntry entry = new FeedEntry(
                UUID.fromString((String) body.get("ownerUserId")),
                body.containsKey("createdAt") ? Instant.parse((String) body.get("createdAt")) : Instant.now(),
                UUID.fromString((String) body.get("postId")),
                UUID.fromString((String) body.get("authorId")),
                (String) body.get("authorUsername"),
                (String) body.get("contentPreview"),
                (String) body.get("postType")
            );
            feedRepo.insert(entry);
            ctx.status(201).json(Map.of("status", "creado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /feed/{ownerId}/{createdAt}/{postId}
    private static void eliminarFeedEntry(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            Instant createdAt = Instant.parse(ctx.pathParam("createdAt"));
            UUID postId = UUID.fromString(ctx.pathParam("postId"));
            feedRepo.delete(ownerId, createdAt, postId);
            ctx.json(Map.of("status", "eliminado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // FEED — queries secuenciales
    // =========================================================================

    // GET /feed/{ownerId}/rango?desde=2021-01-01T00:00:00Z&hasta=2022-01-01T00:00:00Z
    // Range scan sobre clustering key: lee secuencialmente el segmento de la partición
    // que cae entre los dos timestamps, sin tocar el resto.
    private static void getFeedRango(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            Instant desde = Instant.parse(ctx.queryParam("desde"));
            Instant hasta = Instant.parse(ctx.queryParam("hasta"));
            List<FeedEntry> result = feedRepo.getByOwnerInRange(ownerId, desde, hasta);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // GET /feed/{ownerId}/pagina?cursor=2022-06-01T00:00:00Z&limite=10
    // Paginación por cursor: el cliente pasa el created_at del último ítem recibido
    // y Cassandra continúa la lectura secuencial desde ese punto.
    private static void getFeedPagina(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            Instant cursor = Instant.parse(ctx.queryParam("cursor"));
            int limite = Integer.parseInt(ctx.queryParamAsClass("limite", String.class).getOrDefault("10"));
            List<FeedEntry> result = feedRepo.getPageBefore(ownerId, cursor, limite);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // GET /feed/{ownerId}/ultimos/{n}
    // Top N: LIMIT sobre la partición ordenada DESC — Cassandra para en cuanto lee N filas.
    private static void getFeedUltimos(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            int n = Integer.parseInt(ctx.pathParam("n"));
            List<FeedEntry> result = feedRepo.getTopN(ownerId, n);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // GET /feed/{ownerId}/tipo/{postType}
    // Usa la tabla feed_by_user_and_type: partition key = (owner_user_id, post_type),
    // así el filtro por tipo es una lectura de partición directa, no ALLOW FILTERING.
    private static void getFeedByTipo(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            String postType = ctx.pathParam("postType");
            List<FeedEntry> result = feedRepo.getByOwnerAndType(ownerId, postType);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // MENSAJES — CRUD base
    // =========================================================================

    // GET /mensajes/{conversationId}
    private static void getMensajes(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            ctx.result(mapper.writeValueAsString(messageRepo.getByConversation(convId)));
            ctx.contentType("application/json");
        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of("error", "UUID inválido"));
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }

    // POST /mensajes  body: { conversationId, senderId, receiverId, content, mediaUrl?, sentAt? }
    private static void crearMensaje(Context ctx) {
        try {
            Map<?, ?> body = mapper.readValue(ctx.body(), Map.class);
            Message msg = new Message(
                UUID.fromString((String) body.get("conversationId")),
                body.containsKey("sentAt") ? Instant.parse((String) body.get("sentAt")) : Instant.now(),
                UUID.randomUUID(),
                UUID.fromString((String) body.get("senderId")),
                UUID.fromString((String) body.get("receiverId")),
                (String) body.get("content"),
                false,
                (String) body.getOrDefault("mediaUrl", null)
            );
            messageRepo.insert(msg);
            ctx.status(201).result(mapper.writeValueAsString(Map.of(
                "status", "creado",
                "messageId", msg.getMessageId().toString(),
                "sentAt", msg.getSentAt().toString()
            )));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // PUT /mensajes/leer  body: { conversationId, sentAt, messageId }
    private static void marcarLeido(Context ctx) {
        try {
            Map<?, ?> body = mapper.readValue(ctx.body(), Map.class);
            UUID convId = UUID.fromString((String) body.get("conversationId"));
            Instant sentAt = Instant.parse((String) body.get("sentAt"));
            UUID msgId = UUID.fromString((String) body.get("messageId"));
            messageRepo.markAsRead(convId, sentAt, msgId);
            ctx.json(Map.of("status", "marcado como leído"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /mensajes/{convId}/{sentAt}/{messageId}
    private static void eliminarMensaje(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("convId"));
            Instant sentAt = Instant.parse(ctx.pathParam("sentAt"));
            UUID msgId = UUID.fromString(ctx.pathParam("messageId"));
            messageRepo.delete(convId, sentAt, msgId);
            ctx.json(Map.of("status", "eliminado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // MENSAJES — queries secuenciales
    // =========================================================================

    // GET /mensajes/{conversationId}/rango?desde=2021-01-01T00:00:00Z&hasta=2021-06-01T00:00:00Z
    // Range scan: lee el segmento de mensajes entre dos timestamps de forma secuencial.
    private static void getMensajesRango(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            Instant desde = Instant.parse(ctx.queryParam("desde"));
            Instant hasta = Instant.parse(ctx.queryParam("hasta"));
            List<Message> result = messageRepo.getByConversationInRange(convId, desde, hasta);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // GET /mensajes/{conversationId}/desde/{timestamp}
    // Mensajes nuevos desde un timestamp: patrón "dame todo lo que llegó después de
    // la última vez que chequeé". Lectura secuencial desde ese punto hasta el fin.
    private static void getMensajesDesde(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            Instant desde = Instant.parse(ctx.pathParam("timestamp"));
            List<Message> result = messageRepo.getByConversationFrom(convId, desde);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // GET /mensajes/{conversationId}/no-leidos
    // Mensajes no leídos: usa ALLOW FILTERING sobre is_read dentro de la partición.
    // Correcto porque el filtro por partition key ya limita el scope; no hace full scan.
    private static void getMensajesNoLeidos(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            List<Message> result = messageRepo.getUnread(convId);
            ctx.result(mapper.writeValueAsString(result));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }
}
