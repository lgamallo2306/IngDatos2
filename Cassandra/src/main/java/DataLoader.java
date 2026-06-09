import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.FeedEntry;
import models.Message;

import java.io.File;
import java.time.Instant;
import java.util.UUID;

public class DataLoader {
    private final CassandraService service;
    private final ObjectMapper mapper = new ObjectMapper();

    public DataLoader(CassandraService service) {
        this.service = service;
    }

    public int[] loadFromFile(String jsonPath) throws Exception {
        JsonNode root = mapper.readTree(new File(jsonPath));
        int feedCount = loadFeed(root.get("feed"));
        int msgCount = loadMessages(root.get("messages"));
        return new int[]{feedCount, msgCount};
    }

    private int loadFeed(JsonNode feedArray) {
        if (feedArray == null || !feedArray.isArray()) return 0;
        int count = 0;
        for (JsonNode node : feedArray) {
            try {
                FeedEntry entry = new FeedEntry(
                    UUID.fromString(node.get("owner_user_id").asText()),
                    Instant.parse(node.get("created_at").asText()),
                    UUID.fromString(node.get("post_id").asText()),
                    UUID.fromString(node.get("author_id").asText()),
                    node.get("author_username").asText(),
                    node.get("content_preview").asText(),
                    node.get("post_type").asText()
                );
                service.insertFeed(entry);
                count++;
            } catch (Exception e) {
                System.err.println("[DataLoader] Feed error: " + e.getMessage());
            }
        }
        return count;
    }

    private int loadMessages(JsonNode msgArray) {
        if (msgArray == null || !msgArray.isArray()) return 0;
        int count = 0;
        for (JsonNode node : msgArray) {
            try {
                JsonNode msgIdNode = node.get("message_id");
                UUID messageId = (msgIdNode == null || msgIdNode.isNull())
                    ? UUID.randomUUID()
                    : UUID.fromString(msgIdNode.asText());

                JsonNode mediaNode = node.get("media_url");
                String mediaUrl = (mediaNode == null || mediaNode.isNull()) ? null : mediaNode.asText();

                Message msg = new Message(
                    UUID.fromString(node.get("conversation_id").asText()),
                    Instant.parse(node.get("sent_at").asText()),
                    messageId,
                    UUID.fromString(node.get("sender_id").asText()),
                    UUID.fromString(node.get("receiver_id").asText()),
                    node.get("content").asText(),
                    node.get("read").asBoolean(),
                    mediaUrl
                );
                service.insertMessage(msg);
                count++;
            } catch (Exception e) {
                System.err.println("[DataLoader] Message error: " + e.getMessage());
            }
        }
        return count;
    }
}
