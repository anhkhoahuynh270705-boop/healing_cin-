package com.healingcinema.room.controller;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import lombok.RequiredArgsConstructor;

import com.healingcinema.room.dto.RoomDtos.ChatMessageDto;
import com.healingcinema.room.dto.RoomDtos.ChatRequest;
import com.healingcinema.room.dto.RoomDtos.DanceActionRequest;
import com.healingcinema.room.dto.RoomDtos.JoinRequest;
import com.healingcinema.room.dto.RoomDtos.MoveRequest;
import com.healingcinema.room.dto.RoomDtos.Movement;
import com.healingcinema.room.dto.RoomDtos.PlaybackCommand;
import com.healingcinema.room.dto.RoomDtos.QueueRequest;
import com.healingcinema.room.dto.RoomDtos.QueueVoteRequest;
import com.healingcinema.room.dto.RoomDtos.VideoTitleRequest;
import com.healingcinema.room.dto.RoomDtos.Reaction;
import com.healingcinema.room.dto.RoomDtos.ReactionRequest;
import com.healingcinema.room.dto.RoomDtos.RoomError;
import com.healingcinema.room.dto.RoomDtos.RoomState;
import com.healingcinema.room.dto.RoomDtos.SeatRequest;
import com.healingcinema.room.dto.RoomDtos.VoteSkipRequest;
import com.healingcinema.room.mapper.RoomMapper;
import com.healingcinema.room.service.RoomService;
import com.healingcinema.auth.service.AuthService;

@Controller
@RequiredArgsConstructor
public class RoomController {

    private final RoomService rooms;
    private final SimpMessagingTemplate messaging;
    private final AuthService auth;

    @MessageMapping("/room/{roomId}/join")
    public void join(@DestinationVariable String roomId, @Payload JoinRequest request, SimpMessageHeaderAccessor headers) {
        String sessionId = headers.getSessionId();
        try {
            String verifiedUserId = auth.isValidSession(request.userId(), request.authToken()) ? request.userId() : null;
            RoomState state = rooms.join(roomId, sessionId, request.clientId(), request.name(), request.avatar(), request.seat(), request.shirtColorIndex(), request.accessoryIndex(), request.hairColorIndex(), request.vipTier(), verifiedUserId, request.gender(), request.shirtColor(), request.shirtTier());
            messaging.convertAndSend("/topic/room/" + roomId + "/joined/" + request.clientId(),
                    RoomMapper.toJoined(sessionId, state));
            broadcastState(roomId);
        } catch (RuntimeException ex) {
            sendError(roomId, request.clientId(), ex.getMessage());
        }
    }

    @MessageMapping("/room/{roomId}/move")
    public void move(@DestinationVariable String roomId, @Payload MoveRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        Movement movement = rooms.move(roomId, headers.getSessionId(), request.x(), request.y(), request.face());
        if (movement != null) {
            messaging.convertAndSend("/topic/room/" + roomId + "/movement", movement);
            if (movement.seatReleased()) {
                broadcastState(roomId);
            }
        }
    }

    @MessageMapping("/room/{roomId}/seat")
    public void seat(@DestinationVariable String roomId, @Payload SeatRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        if (!rooms.claimSeat(roomId, headers.getSessionId(), request.seatIndex())) {
            sendError(roomId, request.clientId(), "Ghế này đã có người hoặc không hợp lệ."); 
        } else {
            broadcastState(roomId);
        }
    }

    @MessageMapping("/room/{roomId}/queue")
    public void queue(@DestinationVariable String roomId, @Payload QueueRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        try {
            rooms.addVideo(roomId, headers.getSessionId(), request.videoId(), request.title(), request.environment());
            broadcastState(roomId);
            broadcastPlayback(roomId, request.environment());
        } catch (RuntimeException ex) {
            sendError(roomId, request.clientId(), ex.getMessage());
        }
    }

    @MessageMapping("/room/{roomId}/queue/title")
    public void updateVideoTitle(@DestinationVariable String roomId, @Payload VideoTitleRequest request,
            SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        if (rooms.updateVideoTitle(roomId, headers.getSessionId(), request.videoId(), request.title(), request.environment())) {
            broadcastState(roomId);
            broadcastPlayback(roomId, request.environment());
        }
    }

    @MessageMapping("/room/{roomId}/queue/vote")
    public void voteQueueVideo(@DestinationVariable String roomId, @Payload QueueVoteRequest request,
            SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        if (rooms.voteQueueVideo(roomId, headers.getSessionId(), request.videoId(), request.environment())) {
            broadcastState(roomId);
        } else {
            sendError(roomId, request.clientId(), "Bạn đã vote video này rồi hoặc video không còn trong hàng chờ.");
        }
    }

    @MessageMapping("/room/{roomId}/reaction")
    public void reaction(@DestinationVariable String roomId, @Payload ReactionRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        Reaction reaction = rooms.reaction(roomId, headers.getSessionId(), request.emoji());
        if (reaction != null) {
            messaging.convertAndSend("/topic/room/" + roomId + "/reaction", reaction);
        }
    }

    @MessageMapping("/room/{roomId}/action")
    public void danceAction(@DestinationVariable String roomId, @Payload DanceActionRequest request,
            SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        boolean updated = rooms.setDanceAction(roomId, headers.getSessionId(), request.action(), request.returnSeat());
        if (updated) broadcastState(roomId);
        else sendError(roomId, request.clientId(), "Không thể cập nhật động tác lúc này.");
    }

    @MessageMapping("/room/{roomId}/chat")
    public void chat(@DestinationVariable String roomId, @Payload ChatRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        String sessionId = headers.getSessionId();
        if (!rooms.canChat(roomId, sessionId)) {
            sendError(roomId, request.clientId(), "Tài khoản chưa được admin duyệt quyền chat.");
            return;
        }
        ChatMessageDto msg = rooms.chat(roomId, sessionId, request.text(), request.vipTier());
        if (msg != null) {
            messaging.convertAndSend("/topic/room/" + roomId + "/chat", msg);
            // Phát state sau khi transaction lưu xong để client nhận lịch sử mới nhất của đúng phòng.
            broadcastState(roomId);
        } else {
            sendError(roomId, request.clientId(), "Tin nhắn trống hoặc không hợp lệ.");
        }
    }

    @MessageMapping("/room/{roomId}/profile")
    public void profile(@DestinationVariable String roomId, @Payload JoinRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        if (rooms.updateProfile(roomId, headers.getSessionId(), request.name(), request.avatar(), request.shirtColorIndex(), request.accessoryIndex(), request.hairColorIndex(), request.vipTier(), request.gender(), request.shirtColor(), request.shirtTier())) {
            broadcastState(roomId);
        }
    }

    @MessageMapping("/room/{roomId}/vote-skip")
    public void voteSkip(@DestinationVariable String roomId, @Payload VoteSkipRequest request, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        if (rooms.voteSkip(roomId, headers.getSessionId(), request.environment())) {
            broadcastState(roomId);
            broadcastPlayback(roomId, request.environment());
        }
    }

    @MessageMapping("/room/{roomId}/playback")
    public void playback(@DestinationVariable String roomId, @Payload PlaybackCommand command, SimpMessageHeaderAccessor headers) {
        if (!safeRoom(roomId)) return;
        var updated = rooms.command(roomId, headers.getSessionId(), command.action(), command.playing(), command.position(), command.environment());
        if (updated != null) {
            broadcastPlayback(roomId, command.environment());
            broadcastState(roomId);
        }
    }

    @Scheduled(fixedRate = 5000)
    public void syncPlayback() {
        for (String roomId : rooms.allRoomIds()) {
            broadcastPlayback(roomId, "indoor");
            broadcastPlayback(roomId, "outdoor");
        }
    }

    @EventListener
    public void disconnected(SessionDisconnectEvent event) {
        String roomId = rooms.leaveFromAnyRoom(event.getSessionId());
        if (roomId != null) {
            broadcastState(roomId);
            broadcastPlayback(roomId, "indoor");
            broadcastPlayback(roomId, "outdoor");
        }
    }

    private void broadcastState(String roomId) {
        if (!safeRoom(roomId)) return;
        for (String environment : java.util.List.of("indoor", "outdoor")) {
            messaging.convertAndSend("/topic/room/" + roomId + "/state/" + environment,
                    rooms.snapshot(roomId, environment));
        }
    }

    private void broadcastPlayback(String roomId, String environment) {
        String safeEnvironment = "outdoor".equalsIgnoreCase(environment) ? "outdoor" : "indoor";
        messaging.convertAndSend("/topic/room/" + roomId + "/playback/" + safeEnvironment,
                rooms.playbackSnapshot(roomId, safeEnvironment));
    }

    private boolean safeRoom(String roomId) {
        return rooms.isRoomAvailable(roomId);
    }

    private void sendError(String roomId, String clientId, String message) {
        if (clientId != null && clientId.matches("[A-Za-z0-9-]{1,64}")) {
            messaging.convertAndSend("/topic/room/" + roomId + "/errors/" + clientId, new RoomError(clientId, message == null ? "Có lỗi xảy ra." : message));
        }
    }
}
