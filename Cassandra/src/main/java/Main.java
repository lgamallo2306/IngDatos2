import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.javalin.Javalin;
import io.javalin.http.Context;
import models.FeedEntry;
import models.Message;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class Main {

    private static CassandraService service;
    private static final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    private static final String DATASET_PATH = "datasetMediano.json";

    public static void main(String[] args) {
        service = new CassandraService();

        Javalin app = Javalin.create(config -> {
            config.bundledPlugins.enableCors(cors -> cors.addRule(it -> it.anyHost()));
        }).start(7000);

        app.post("/cargar", Main::cargarDataset);

        // Feed — CRUD base
        app.get("/feed/{ownerId}", Main::getFeed);
        app.post("/feed", Main::crearFeedEntry);
        app.delete("/feed/{ownerId}/{createdAt}/{postId}", Main::eliminarFeedEntry);

        // Feed — queries secuenciales
        app.get("/feed/{ownerId}/rango", Main::getFeedRango);           // ?desde=&hasta=
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

        Runtime.getRuntime().addShutdownHook(new Thread(service::close));
    }

    // =========================================================================
    // CARGA
    // =========================================================================

    private static void cargarDataset(Context ctx) {
        try {
            int[] counts = new DataLoader(service).loadFromFile(DATASET_PATH);
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

    private static void getFeed(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            ctx.result(mapper.writeValueAsString(service.getFeed(ownerId)));
            ctx.contentType("application/json");
        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of("error", "UUID inválido"));
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }

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
            service.insertFeed(entry);
            ctx.status(201).json(Map.of("status", "creado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void eliminarFeedEntry(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            Instant createdAt = Instant.parse(ctx.pathParam("createdAt"));
            UUID postId = UUID.fromString(ctx.pathParam("postId"));
            service.deleteFeed(ownerId, createdAt, postId);
            ctx.json(Map.of("status", "eliminado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // FEED — queries secuenciales
    // =========================================================================

    private static void getFeedRango(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            Instant desde = Instant.parse(ctx.queryParam("desde"));
            Instant hasta = Instant.parse(ctx.queryParam("hasta"));
            ctx.result(mapper.writeValueAsString(service.getFeedRange(ownerId, desde, hasta)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void getFeedUltimos(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            int n = Integer.parseInt(ctx.pathParam("n"));
            ctx.result(mapper.writeValueAsString(service.getFeedTopN(ownerId, n)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void getFeedByTipo(Context ctx) {
        try {
            UUID ownerId = UUID.fromString(ctx.pathParam("ownerId"));
            String postType = ctx.pathParam("postType");
            ctx.result(mapper.writeValueAsString(service.getFeedByType(ownerId, postType)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // MENSAJES — CRUD base
    // =========================================================================

    private static void getMensajes(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            ctx.result(mapper.writeValueAsString(service.getMessages(convId)));
            ctx.contentType("application/json");
        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of("error", "UUID inválido"));
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }

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
            service.insertMessage(msg);
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

    private static void marcarLeido(Context ctx) {
        try {
            Map<?, ?> body = mapper.readValue(ctx.body(), Map.class);
            UUID convId = UUID.fromString((String) body.get("conversationId"));
            Instant sentAt = Instant.parse((String) body.get("sentAt"));
            UUID msgId = UUID.fromString((String) body.get("messageId"));
            service.markAsRead(convId, sentAt, msgId);
            ctx.json(Map.of("status", "marcado como leído"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void eliminarMensaje(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("convId"));
            Instant sentAt = Instant.parse(ctx.pathParam("sentAt"));
            UUID msgId = UUID.fromString(ctx.pathParam("messageId"));
            service.deleteMessage(convId, sentAt, msgId);
            ctx.json(Map.of("status", "eliminado"));
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================================
    // MENSAJES — queries secuenciales
    // =========================================================================

    private static void getMensajesRango(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            Instant desde = Instant.parse(ctx.queryParam("desde"));
            Instant hasta = Instant.parse(ctx.queryParam("hasta"));
            ctx.result(mapper.writeValueAsString(service.getMessagesRange(convId, desde, hasta)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void getMensajesDesde(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            Instant desde = Instant.parse(ctx.pathParam("timestamp"));
            ctx.result(mapper.writeValueAsString(service.getMessagesFrom(convId, desde)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(400).json(Map.of("error", e.getMessage()));
        }
    }

    private static void getMensajesNoLeidos(Context ctx) {
        try {
            UUID convId = UUID.fromString(ctx.pathParam("conversationId"));
            ctx.result(mapper.writeValueAsString(service.getUnreadMessages(convId)));
            ctx.contentType("application/json");
        } catch (Exception e) {
            ctx.status(500).json(Map.of("error", e.getMessage()));
        }
    }
}
