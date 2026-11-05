package com.healingcinema.media;

public final class MediaDtos {
    private MediaDtos() {}

    public record UploadResponse(String id, String title, String contentType, int durationSeconds,
            long chargedAmount, long usableBalance) {}
}
