package com.healingcinema.room.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.payment.service.PaymentApprovalService;
import com.healingcinema.room.dto.RoomDtos.ChatMessageDto;
import com.healingcinema.room.dto.RoomDtos.Guest;
import com.healingcinema.room.dto.RoomDtos.Movement;
import com.healingcinema.room.dto.RoomDtos.Playback;
import com.healingcinema.room.dto.RoomDtos.Reaction;
import com.healingcinema.room.dto.RoomDtos.RoomState;
import com.healingcinema.room.dto.RoomDtos.VideoItem;
import com.healingcinema.room.entity.ChatMessageEntity;
import com.healingcinema.room.entity.GuestSessionEntity;
import com.healingcinema.room.entity.QueueVideoEntity;
import com.healingcinema.room.entity.RoomEntity;
import com.healingcinema.room.entity.SkipVoteEntity;
import com.healingcinema.room.repository.ChatMessageRepository;
import com.healingcinema.room.repository.GuestSessionRepository;
import com.healingcinema.room.repository.QueueVideoRepository;
import com.healingcinema.room.repository.QueueVideoVoteRepository;
import com.healingcinema.room.repository.RoomRepository;
import com.healingcinema.room.repository.SkipVoteRepository;

import lombok.RequiredArgsConstructor;

/** Trạng thái nghiệp vụ của phòng được đọc và ghi trực tiếp qua PostgreSQL. */
@Service
@RequiredArgsConstructor
public class RoomService {

    public static final String ROOM_ID = "rap-chua-lanh";
    private static final List<Double> SEAT_DEPTHS = List.of(.40, .62, .84, 1.06, 1.28, 1.50);
    private static final List<Double> SEAT_COLUMNS = List.of(.06, .14, .22, .36, .45, .55, .64, .78, .86, .94);
    private static final List<String> LOFI = List.of("jfKfPfyJRdk", "Llw9Q6akRo4", "FN7ALfpGxiI", "knW7-x7Y7RE",
            "qGRU3sRbaYw");
    private static final List<String> LOFI_TITLES = List.of(
            "Lofi Girl — beats to relax/study to",
            "Sơn Tùng M-TP - Lạc Trôi (Official MV)",
            "Sơn Tùng M-TP - Nơi Này Có Anh (Official MV)",
            "Sơn Tùng M-TP - Hãy Trao Cho Anh ft. Snoop Dogg (Official MV)",
            "Sơn Tùng M-TP - Chúng Ta Không Thuộc Về Nhau (Official MV)");
    private static final Set<String> AVATARS = Set.of("🧸", "🐈", "🐸", "🦊", "🐼", "🐰", "🐻", "🦉", "🐱", "🐣", "🦦",
            "🐹", "🐨", "🦋", "🐧", "🦝", "🐢", "🦔");
    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final int SEAT_COUNT = SEAT_DEPTHS.size() * SEAT_COLUMNS.size();

    private final PaymentApprovalService payments;
    private final RoomRepository roomRepository;
    private final GuestSessionRepository guestRepository;
    private final QueueVideoRepository queueRepository;
    private final QueueVideoVoteRepository queueVoteRepository;
    private final SkipVoteRepository skipVoteRepository;
    private final ChatMessageRepository chatRepository;

    @Transactional(readOnly = true)
    public boolean isRoomAvailable(String roomId) {
        return roomId != null && (ROOM_ID.equals(roomId) || payments.isPrivateRoom(roomId));
    }

    @Transactional
    public RoomState join(String roomId, String sessionId, String clientId, String name, String avatar,
            Integer seat, Integer shirtColorIndex, Integer accessoryIndex, Integer hairColorIndex,
            Integer ignoredVipTier, String userId) {
        RoomEntity room = getRoom(roomId);
        String safeName = name == null || name.isBlank() ? "Khách" : limit(name.strip(), 18);
        String safeAvatar = avatar != null && AVATARS.contains(avatar) ? avatar : "🧸";
        if (clientId != null && !clientId.isBlank())
            guestRepository.deleteByRoomIdAndClientId(roomId, clientId);

        long count = guestRepository.countByRoomId(roomId);
        GuestSessionEntity guest = GuestSessionEntity.builder()
                .id(sessionId).roomId(roomId).clientId(clientId).userId(userId)
                .name(safeName).avatar(safeAvatar)
                .x(.475 + (count % 4) * .017).y(.66 + ((count / 4) % 4) * .075).face(1)
                .shirtColorIndex(validIndex(shirtColorIndex) ? shirtColorIndex : 0)
                .accessoryIndex(validIndex(accessoryIndex) ? accessoryIndex : 0)
                .hairColorIndex(validIndex(hairColorIndex) ? hairColorIndex : 0)
                .vipTier(payments.approvedTier(userId)).lastMoveAt(0).joinedAt(System.currentTimeMillis())
                .build();
        guestRepository.save(guest);
        if (room.getHostId() == null || !guestRepository.existsById(room.getHostId())) {
            room.setHostId(sessionId);
        }
        if (seat != null && seat >= 0 && seat < SEAT_COUNT)
            assignSeat(roomId, guest, seat);
        roomRepository.save(room);
        return snapshot(roomId);
    }

    @Transactional(readOnly = true)
    public List<String> allRoomIds() {
        // Đảm bảo rạp chung luôn tồn tại dù chưa có ai kết nối.
        return roomRepository.findAllByOrderByIdAsc().stream().map(RoomEntity::getId).toList();
    }

    @Transactional(readOnly = true)
    public String roomIdForSession(String sessionId) {
        return guestRepository.findById(sessionId).map(GuestSessionEntity::getRoomId).orElse(null);
    }

    @Transactional
    public String leaveFromAnyRoom(String sessionId) {
        GuestSessionEntity guest = guestRepository.findById(sessionId).orElse(null);
        if (guest == null)
            return null;
        String roomId = guest.getRoomId();
        leave(roomId, sessionId);
        return roomId;
    }

    @Transactional
    public RoomState snapshot(String roomId) {
        RoomEntity room = getRoom(roomId);
        List<Guest> guests = guestRepository.findByRoomIdOrderByJoinedAtAsc(roomId).stream()
                .map(RoomService::toGuest).toList();
        List<VideoItem> queue = queueRepository.findByRoomIdOrderByQueuedAtAscIdAsc(roomId).stream()
                .map(item -> new VideoItem(item.getVideoId(), item.getTitle(), item.getRequestedBy(),
                        (int) queueVoteRepository.countByRoomIdAndVideoId(roomId, item.getVideoId())))
                .sorted(java.util.Comparator.comparingInt(VideoItem::votes).reversed())
                .toList();
        List<ChatMessageDto> chat = chatRepository.findTop100ByRoomIdOrderByTimeDesc(roomId).stream()
                .sorted(java.util.Comparator.comparingLong(ChatMessageEntity::getTime))
                .map(RoomService::toChatDto).toList();
        long guestCount = guestRepository.countByRoomId(roomId);
        int skipVotes = (int) skipVoteRepository.countByRoomId(roomId);
        String roomName = ROOM_ID.equals(roomId) ? "Rạp chung" : room.getName();
        return new RoomState(roomId, roomName, currentPlayback(room, System.currentTimeMillis()), queue, guests,
                room.getHostId(), SEAT_COUNT, skipVotes, requiredSkipVotes(guestCount), chat);
    }

    @Transactional
    public Playback playbackSnapshot(String roomId) {
        return currentPlayback(getRoom(roomId), System.currentTimeMillis());
    }

    @Transactional
    public Movement move(String roomId, String sessionId, Double requestedX, Double requestedY, Integer requestedFace) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || requestedX == null || requestedY == null
                || !Double.isFinite(requestedX) || !Double.isFinite(requestedY))
            return null;
        long now = System.currentTimeMillis();
        if (now - guest.getLastMoveAt() < 45)
            return null;
        boolean seatReleased = guest.getSeat() != null;
        guest.setSeat(null);
        guest.setX(clamp(requestedX, .04, .96));
        guest.setY(clamp(requestedY, .04, .96));
        guest.setFace(requestedFace != null && requestedFace < 0 ? -1 : 1);
        guest.setLastMoveAt(now);
        guestRepository.save(guest);
        return new Movement(sessionId, guest.getX(), guest.getY(), guest.getFace(), seatReleased);
    }

    @Transactional
    public boolean claimSeat(String roomId, String sessionId, Integer seatIndex) {
        if (seatIndex == null || seatIndex < 0 || seatIndex >= SEAT_COUNT)
            return false;
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || guestRepository.existsByRoomIdAndSeatAndIdNot(roomId, seatIndex, sessionId))
            return false;
        return assignSeat(roomId, guest, seatIndex);
    }

    private boolean assignSeat(String roomId, GuestSessionEntity guest, int seatIndex) {
        if (guestRepository.existsByRoomIdAndSeatAndIdNot(roomId, seatIndex, guest.getId()))
            return false;
        int row = seatIndex / SEAT_COLUMNS.size();
        int column = seatIndex % SEAT_COLUMNS.size();
        double depth = SEAT_DEPTHS.get(row);
        double minX = Math.max(.04, depth - .96);
        double maxX = Math.min(.96, depth - .04);
        guest.setX(minX + (maxX - minX) * SEAT_COLUMNS.get(column));
        guest.setY(depth - guest.getX());
        guest.setSeat(seatIndex);
        guestRepository.save(guest);
        return true;
    }

    @Transactional(readOnly = true)
    public Reaction reaction(String roomId, String sessionId, String emoji) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || emoji == null || emoji.isBlank())
            return null;
        return new Reaction(sessionId + "-" + System.currentTimeMillis(), emoji, guest.getAvatar(), guest.getName(),
                guest.getX(), guest.getY(), System.currentTimeMillis());
    }

    @Transactional
    public ChatMessageDto chat(String roomId, String sessionId, String text, Integer vipTier) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || text == null || text.isBlank())
            return null;
        String safeText = text.strip().replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        safeText = limit(safeText, 100);
        int requestedTier = vipTier == null ? 0 : vipTier;
        int effectiveTier = requestedTier == 0 || payments.approvedTiers(guest.getUserId()).contains(requestedTier)
                ? requestedTier
                : 0;
        ChatMessageEntity entity = ChatMessageEntity.builder()
                .id(UUID.randomUUID().toString()).roomId(roomId).senderId(sessionId)
                .senderName(guest.getName()).senderAvatar(guest.getAvatar()).text(safeText)
                .time(System.currentTimeMillis()).vipTier(effectiveTier).build();
        chatRepository.save(entity);
        List<String> keepIds = chatRepository.findTop100ByRoomIdOrderByTimeDesc(roomId).stream()
                .map(ChatMessageEntity::getId).toList();
        chatRepository.deleteByRoomIdAndIdNotIn(roomId, keepIds);
        return toChatDto(entity);
    }

    @Transactional(readOnly = true)
    public boolean canChat(String roomId, String sessionId) {
        return guestRepository.existsByRoomIdAndId(roomId, sessionId);
    }

    @Transactional
    public boolean updateProfile(String roomId, String sessionId, String name, String avatar,
            Integer shirtColorIndex, Integer accessoryIndex, Integer hairColorIndex, Integer ignoredVipTier) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null)
            return false;
        if (name != null && !name.isBlank())
            guest.setName(limit(name.strip(), 18));
        if (avatar != null && AVATARS.contains(avatar))
            guest.setAvatar(avatar);
        if (validIndex(shirtColorIndex))
            guest.setShirtColorIndex(shirtColorIndex);
        if (validIndex(accessoryIndex))
            guest.setAccessoryIndex(accessoryIndex);
        if (validIndex(hairColorIndex))
            guest.setHairColorIndex(hairColorIndex);
        guest.setVipTier(payments.approvedTier(guest.getUserId()));
        guestRepository.save(guest);
        return true;
    }

    @Transactional
    public RoomState addVideo(String roomId, String sessionId, String videoId, String title) {
        RoomEntity room = getRoom(roomId);
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null)
            throw new IllegalArgumentException("Hãy vào phòng trước khi gửi video.");
        if (videoId == null || !VIDEO_ID.matcher(videoId).matches()) {
            throw new IllegalArgumentException("Video ID YouTube không hợp lệ.");
        }
        if (room.getPlaybackVideoId().equals(videoId) || queueRepository.existsByRoomIdAndVideoId(roomId, videoId)) {
            throw new IllegalArgumentException("Video này đã có trong phòng.");
        }
        String safeTitle = title == null || title.isBlank() ? "Video YouTube" : limit(title, 100);
        if ("lofi".equals(room.getPlaybackSource())) {
            skipVoteRepository.deleteByRoomId(roomId);
            setPlayback(room, videoId, safeTitle, "queue", 0, true);
            // Lưu video đầu tiên vào trạng thái playback bền vững trong PostgreSQL.
            roomRepository.saveAndFlush(room);
        } else {
            queueRepository.saveAndFlush(QueueVideoEntity.builder().id(UUID.randomUUID().toString()).roomId(roomId)
                    .videoId(videoId).title(safeTitle).requestedBy(guest.getName())
                    .queuedAt(System.currentTimeMillis()).build());
        }
        return snapshot(roomId);
    }

    @Transactional
    public boolean updateVideoTitle(String roomId, String sessionId, String videoId, String title) {
        if (guestRepository.findFirstByRoomIdAndId(roomId, sessionId).isEmpty()
                || videoId == null || !VIDEO_ID.matcher(videoId).matches()
                || title == null || title.isBlank()) {
            return false;
        }

        String safeTitle = limit(title.strip(), 100);
        boolean changed = false;
        RoomEntity room = getRoom(roomId);
        if (videoId.equals(room.getPlaybackVideoId()) && "queue".equals(room.getPlaybackSource())) {
            if (!safeTitle.equals(room.getPlaybackTitle())) {
                room.setPlaybackTitle(safeTitle);
                roomRepository.save(room);
                changed = true;
            }
        }

        QueueVideoEntity queuedVideo = queueRepository.findByRoomIdAndVideoId(roomId, videoId).orElse(null);
        if (queuedVideo != null && !safeTitle.equals(queuedVideo.getTitle())) {
            queuedVideo.setTitle(safeTitle);
            queueRepository.save(queuedVideo);
            changed = true;
        }
        return changed;
    }

    @Transactional
    public boolean voteQueueVideo(String roomId, String sessionId, String videoId) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || videoId == null || !VIDEO_ID.matcher(videoId).matches()
                || !queueRepository.existsByRoomIdAndVideoId(roomId, videoId)) {
            return false;
        }

        String voterId = guest.getUserId() == null || guest.getUserId().isBlank()
                ? "session:" + guest.getId()
                : "user:" + guest.getUserId();
        return queueVoteRepository.insertVoteIfAbsent(UUID.randomUUID().toString(), roomId, videoId,
                voterId, System.currentTimeMillis()) == 1;
    }

    @Transactional
    public boolean voteSkip(String roomId, String sessionId) {
        if (!guestRepository.existsByRoomIdAndId(roomId, sessionId)
                || skipVoteRepository.existsByRoomIdAndSessionId(roomId, sessionId))
            return false;
        skipVoteRepository.save(SkipVoteEntity.builder().id(UUID.randomUUID().toString())
                .roomId(roomId).sessionId(sessionId).build());
        if (skipVoteRepository.countByRoomId(roomId) >= requiredSkipVotes(guestRepository.countByRoomId(roomId))) {
            advance(roomId, getRoom(roomId));
        }
        return true;
    }

    @Transactional
    public Playback command(String roomId, String sessionId, String action, Boolean playing, Double position) {
        RoomEntity room = getRoom(roomId);
        String safeAction = action == null ? "" : action;
        if ("ended".equals(safeAction)) {
            if (sessionId == null || !sessionId.equals(room.getHostId()))
                return null;
            advance(roomId, room);
            roomRepository.save(room);
        } else if (("toggle".equals(safeAction) || "seek".equals(safeAction))
                && sessionId != null && sessionId.equals(room.getHostId())) {
            double safePosition = validPosition(position, room);
            boolean nextPlaying = "toggle".equals(safeAction) ? Boolean.TRUE.equals(playing) : room.isPlaybackPlaying();
            setPlayback(room, room.getPlaybackVideoId(), room.getPlaybackTitle(), room.getPlaybackSource(),
                    safePosition, nextPlaying);
            roomRepository.save(room);
        } else if (!"toggle".equals(safeAction) && !"seek".equals(safeAction)) {
            return null;
        }
        return currentPlayback(room, System.currentTimeMillis());
    }

    @Transactional
    public boolean leave(String roomId, String sessionId) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null)
            return false;
        guestRepository.delete(guest);
        skipVoteRepository.deleteByRoomIdAndSessionId(roomId, sessionId);
        RoomEntity room = getRoom(roomId);
        if (sessionId.equals(room.getHostId())) {
            room.setHostId(guestRepository.findFirstByRoomIdOrderByJoinedAtAsc(roomId)
                    .map(GuestSessionEntity::getId).orElse(null));
            roomRepository.save(room);
        }
        if (skipVoteRepository.countByRoomId(roomId) >= requiredSkipVotes(guestRepository.countByRoomId(roomId))) {
            advance(roomId, room);
            roomRepository.save(room);
        }
        return true;
    }

    @Transactional
    public void nextVideo(String roomId) {
        RoomEntity room = getRoom(roomId);
        advance(roomId, room);
        roomRepository.save(room);
    }

    private void advance(String roomId, RoomEntity room) {
        skipVoteRepository.deleteByRoomId(roomId);
        QueueVideoEntity next = queueRepository.findByRoomIdOrderByQueuedAtAscIdAsc(roomId).stream()
                .sorted(java.util.Comparator
                        .comparingLong((QueueVideoEntity item) ->
                                queueVoteRepository.countByRoomIdAndVideoId(roomId, item.getVideoId()))
                        .reversed()
                        .thenComparingLong(QueueVideoEntity::getQueuedAt)
                        .thenComparing(QueueVideoEntity::getId))
                .findFirst()
                .orElse(null);
        if (next != null) {
            queueRepository.delete(next);
            setPlayback(room, next.getVideoId(), next.getTitle(), "queue", 0, true);
            return;
        }
        int lofiIndex = (room.getLofiIndex() + 1) % LOFI.size();
        room.setLofiIndex(lofiIndex);
        setPlayback(room, LOFI.get(lofiIndex), LOFI_TITLES.get(lofiIndex), "lofi", 0, true);
    }

    private RoomEntity getRoom(String roomId) {
        if (roomId == null)
            throw new IllegalArgumentException("Không tìm thấy phòng.");
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room != null)
            return room;
        if (!ROOM_ID.equals(roomId) && !payments.isPrivateRoom(roomId)) {
            throw new IllegalArgumentException("Không tìm thấy phòng riêng hoặc phòng chưa được duyệt.");
        }
        int lofiIndex = ROOM_ID.equals(roomId) ? 0 : payments.privateRoomLofiIndex(roomId);
        String roomName = ROOM_ID.equals(roomId) ? "Rạp chung" : payments.privateRoomName(roomId);
        return roomRepository.save(RoomEntity.builder().id(roomId).name(roomName)
                .playbackVideoId(LOFI.get(lofiIndex)).playbackTitle(LOFI_TITLES.get(lofiIndex))
                .playbackSource("lofi").playbackPosition(0).playbackPlaying(true)
                .playbackUpdatedAt(System.currentTimeMillis()).lofiIndex(lofiIndex).build());
    }

    private static int requiredSkipVotes(long guests) {
        return (int) Math.ceil(Math.max(1, guests) * .90);
    }

    private static Playback currentPlayback(RoomEntity room, long now) {
        double position = room.getPlaybackPosition()
                + (room.isPlaybackPlaying() ? Math.max(0, now - room.getPlaybackUpdatedAt()) / 1000.0 : 0);
        return new Playback(room.getId(), room.getPlaybackVideoId(), room.getPlaybackTitle(), room.getPlaybackSource(),
                position, room.isPlaybackPlaying(), room.getPlaybackUpdatedAt(), now);
    }

    private static void setPlayback(RoomEntity room, String videoId, String title, String source,
            double position, boolean playing) {
        room.setPlaybackVideoId(videoId);
        room.setPlaybackTitle(title);
        room.setPlaybackSource(source);
        room.setPlaybackPosition(position);
        room.setPlaybackPlaying(playing);
        room.setPlaybackUpdatedAt(System.currentTimeMillis());
    }

    private static double validPosition(Double position, RoomEntity room) {
        if (position == null || !Double.isFinite(position)) {
            return currentPlayback(room, System.currentTimeMillis()).position();
        }
        return Math.max(0, position);
    }

    private static Guest toGuest(GuestSessionEntity guest) {
        return new Guest(guest.getId(), guest.getName(), guest.getAvatar(), guest.getX(), guest.getY(),
                guest.getFace(), guest.getSeat(), guest.getShirtColorIndex(), guest.getAccessoryIndex(),
                guest.getHairColorIndex(), guest.getVipTier());
    }

    private static ChatMessageDto toChatDto(ChatMessageEntity message) {
        return new ChatMessageDto(message.getId(), message.getSenderId(), message.getSenderName(),
                message.getSenderAvatar(), message.getText(), message.getTime(), message.getVipTier());
    }

    private static boolean validIndex(Integer value) {
        return value != null && value >= 0 && value < 10;
    }

    private static String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
