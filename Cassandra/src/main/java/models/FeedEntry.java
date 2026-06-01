package models;

import java.time.Instant;
import java.util.UUID;

public class FeedEntry {
    private UUID ownerUserId;
    private Instant createdAt;
    private UUID postId;
    private UUID authorId;
    private String authorUsername;
    private String contentPreview;
    private String postType;

    public FeedEntry() {}

    public FeedEntry(UUID ownerUserId, Instant createdAt, UUID postId,
                     UUID authorId, String authorUsername,
                     String contentPreview, String postType) {
        this.ownerUserId = ownerUserId;
        this.createdAt = createdAt;
        this.postId = postId;
        this.authorId = authorId;
        this.authorUsername = authorUsername;
        this.contentPreview = contentPreview;
        this.postType = postType;
    }

    public UUID getOwnerUserId() { return ownerUserId; }
    public void setOwnerUserId(UUID ownerUserId) { this.ownerUserId = ownerUserId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public UUID getPostId() { return postId; }
    public void setPostId(UUID postId) { this.postId = postId; }

    public UUID getAuthorId() { return authorId; }
    public void setAuthorId(UUID authorId) { this.authorId = authorId; }

    public String getAuthorUsername() { return authorUsername; }
    public void setAuthorUsername(String authorUsername) { this.authorUsername = authorUsername; }

    public String getContentPreview() { return contentPreview; }
    public void setContentPreview(String contentPreview) { this.contentPreview = contentPreview; }

    public String getPostType() { return postType; }
    public void setPostType(String postType) { this.postType = postType; }
}
