package com.healingcinema.media.dto;

public final class MediaDtos {
    private MediaDtos() {}

    public record UploadResponse(String id, String title, String contentType, int durationSeconds,
            long chargedAmount, long usableBalance, boolean freeVipImage) {}
}
