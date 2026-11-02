package com.healingcinema.room.dto;

import java.util.List;

/**
 * DTO truyền dữ liệu realtime giữa Angular và Spring STOMP.
 */
public final class RoomDtos {

    private RoomDtos() {
    }

    public record JoinRequest(String clientId, String name, String avatar, Integer seat, Integer shirtColorIndex, Integer accessoryIndex, Integer hairColorIndex, Integer vipTier, String userId, String authToken) {}

    public record QueueRequest(String clientId, String videoId, String title) {}

    public record QueueVoteRequest(String clientId, String videoId) {}

    public record VideoTitleRequest(String clientId, String videoId, String title) {}

    public record SeatRequest(String clientId, Integer seatIndex) {}

    public record MoveRequest(String clientId, Double x, Double y, Integer face) {}

    public record ReactionRequest(String clientId, String emoji) {}

    public record PlaybackCommand(String clientId, String action, Boolean playing, Double position) {}

    public record VoteSkipRequest(String clientId) {}

    public record ChatRequest(String clientId, String text, Integer vipTier) {}

    public record Guest(String id, String name, String avatar, double x, double y, int face, Integer seat, Integer shirtColorIndex, Integer accessoryIndex, Integer hairColorIndex, Integer vipTier) {}

    public record VideoItem(String videoId, String title, String requestedBy, int votes) {}

    public record Playback(String roomId, String videoId, String title, String source, double position,
            boolean playing, long updatedAt, long serverNow) {}

    public record RoomState(String roomId, String roomName, Playback playback, List<VideoItem> queue,
            List<Guest> guests, String hostId, int seatCount, int skipVotes, int requiredSkipVotes,
            List<ChatMessageDto> chatHistory) {}

    public record Joined(String sessionId, RoomState state) {}

    public record Movement(String id, double x, double y, int face, boolean seatReleased) {}

    public record Reaction(String id, String emoji, String avatar, String name, double x, double y, long at) {}

    public record ChatMessageDto(String id, String senderId, String senderName, String senderAvatar, String text, long time, Integer vipTier) {}

    public record RoomError(String clientId, String message) {}
}
