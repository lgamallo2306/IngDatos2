package models;

import java.time.Instant;
import java.util.UUID;

public class Message {
    private UUID conversationId;
    private Instant sentAt;
    private UUID messageId;
    private UUID senderId;
    private UUID receiverId;
    private String content;
    private boolean isRead;
    private String mediaUrl;

    public Message() {}

    public Message(UUID conversationId, Instant sentAt, UUID messageId,
                   UUID senderId, UUID receiverId, String content,
                   boolean isRead, String mediaUrl) {
        this.conversationId = conversationId;
        this.sentAt = sentAt;
        this.messageId = messageId;
        this.senderId = senderId;
        this.receiverId = receiverId;
        this.content = content;
        this.isRead = isRead;
        this.mediaUrl = mediaUrl;
    }

    public UUID getConversationId() { return conversationId; }
    public void setConversationId(UUID conversationId) { this.conversationId = conversationId; }

    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }

    public UUID getMessageId() { return messageId; }
    public void setMessageId(UUID messageId) { this.messageId = messageId; }

    public UUID getSenderId() { return senderId; }
    public void setSenderId(UUID senderId) { this.senderId = senderId; }

    public UUID getReceiverId() { return receiverId; }
    public void setReceiverId(UUID receiverId) { this.receiverId = receiverId; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public String getMediaUrl() { return mediaUrl; }
    public void setMediaUrl(String mediaUrl) { this.mediaUrl = mediaUrl; }
}
