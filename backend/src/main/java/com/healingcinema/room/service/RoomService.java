package com.healingcinema.room.service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.payment.service.PaymentApprovalService;
import com.healingcinema.room.chat.entity.ChatMessageEntity;
import com.healingcinema.room.chat.mapper.ChatMapper;
import com.healingcinema.room.chat.repository.ChatMessageRepository;
import com.healingcinema.room.dto.RoomDtos.ChatMessageDto;
import com.healingcinema.room.dto.RoomDtos.Guest;
import com.healingcinema.room.dto.RoomDtos.Movement;
import com.healingcinema.room.dto.RoomDtos.Playback;
import com.healingcinema.room.dto.RoomDtos.Reaction;
import com.healingcinema.room.dto.RoomDtos.RoomState;
import com.healingcinema.room.dto.RoomDtos.VideoItem;
import com.healingcinema.room.entity.RoomEntity;
import com.healingcinema.room.guest.entity.GuestSessionEntity;
import com.healingcinema.room.guest.mapper.GuestMapper;
import com.healingcinema.room.guest.repository.GuestSessionRepository;
import com.healingcinema.room.mapper.RoomMapper;
import com.healingcinema.room.playback.entity.SkipVoteEntity;
import com.healingcinema.room.playback.mapper.PlaybackMapper;
import com.healingcinema.room.playback.repository.SkipVoteRepository;
import com.healingcinema.room.queue.entity.QueueVideoEntity;
import com.healingcinema.room.queue.mapper.QueueMapper;
import com.healingcinema.room.queue.repository.QueueVideoRepository;
import com.healingcinema.room.queue.repository.QueueVideoVoteRepository;
import com.healingcinema.room.reaction.mapper.ReactionMapper;
import com.healingcinema.room.repository.RoomRepository;

import lombok.RequiredArgsConstructor;

/**
 * Trạng thái nghiệp vụ của phòng được đọc và ghi trực tiếp qua PostgreSQL.
 */
@Service
@RequiredArgsConstructor
public class RoomService {

    public static final String ROOM_ID = "rap-chua-lanh";
    private static final List<Double> SEAT_DEPTHS = List.of(.40, .62, .84, 1.06, 1.28, 1.50, 1.72);
    private static final List<Double> SEAT_COLUMNS = List.of(.06, .14, .22, .36, .45, .55, .64, .78, .86, .94);
    private static final int BASE_SEAT_COUNT = (SEAT_DEPTHS.size() - 1) * SEAT_COLUMNS.size();
    private static final int SIDE_SEAT_ROWS = 6;
    private static final int SIDE_SEAT_COLUMNS = 4;
    private static final int SIDE_SEAT_COUNT = SIDE_SEAT_ROWS * SIDE_SEAT_COLUMNS;
    private static final int BACK_ROW_SEAT_COUNT = SEAT_COLUMNS.size();
    private static final int OUTER_SIDE_SEAT_ROWS = 6;
    private static final int OUTER_SIDE_SEAT_COLUMNS = 4;
    private static final int OUTER_SIDE_SEAT_COUNT = OUTER_SIDE_SEAT_ROWS * OUTER_SIDE_SEAT_COLUMNS;
    private static final List<String> LOFI = List.of("Llw9Q6akRo4", "FN7ALfpGxiI", "knW7-x7Y7RE",
            "qGRU3sRbaYw", "jfKfPfyJRdk");
    private static final List<String> LOFI_TITLES = List.of(
            "Sơn Tùng M-TP - Lạc Trôi (Official MV)",
            "Sơn Tùng M-TP - Nơi Này Có Anh (Official MV)",
            "Sơn Tùng M-TP - Hãy Trao Cho Anh ft. Snoop Dogg (Official MV)",
            "Sơn Tùng M-TP - Chúng Ta Không Thuộc Về Nhau (Official MV)",
            "Lofi Girl — beats to relax/study to");
    private static final Set<String> AVATARS = Set.of("🧸", "🐈", "🐸", "🦊", "🐼", "🐰", "🐻", "🦉", "🐱", "🐣", "🦦",
            "🐹", "🐨", "🦋", "🐧", "🦝", "🐢", "🦔");
    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final int SEAT_COUNT = BASE_SEAT_COUNT + SIDE_SEAT_COUNT + BACK_ROW_SEAT_COUNT
            + OUTER_SIDE_SEAT_COUNT;

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
            Integer ignoredVipTier, String userId, String gender, String shirtColor, Integer shirtTier,
            String environment) {
        RoomEntity room = getRoom(roomId);
        String safeEnvironment = safeEnvironment(environment);
        String safeName = name == null || name.isBlank() ? "Khách" : limit(name.strip(), 18);
        String safeAvatar = avatar != null && AVATARS.contains(avatar) ? avatar : "🧸";
        if (clientId != null && !clientId.isBlank()) {
            guestRepository.deleteByRoomIdAndClientId(roomId, clientId);
        }

        long count = guestRepository.countByRoomId(roomId);
        GuestSessionEntity guest = GuestSessionEntity.builder()
                .id(sessionId).roomId(roomId).clientId(clientId).userId(userId)
                .environment(safeEnvironment)
                .name(safeName).avatar(safeAvatar).gender(validGender(gender) ? gender : "male")
                .shirtColor(validShirtColor(shirtColor) ? shirtColor : "#9FADD9")
                .shirtTier(validShirtTier(shirtTier))
                .x(.475 + (count % 4) * .017).y(.66 + ((count / 4) % 4) * .075).face(1)
                .shirtColorIndex(validIndex(shirtColorIndex) ? shirtColorIndex : 0)
                .accessoryIndex(validIndex(accessoryIndex) ? accessoryIndex : 0)
                .hairColorIndex(validIndex(hairColorIndex) ? hairColorIndex : 0)
                .vipTier(payments.approvedTier(userId)).lastMoveAt(0).joinedAt(System.currentTimeMillis())
                .action("idle")
                .build();
        guestRepository.save(guest);
        if (room.getHostId() == null || !guestRepository.existsById(room.getHostId())) {
            room.setHostId(sessionId);
        }
        if (seat != null && seat >= 0 && seat < SEAT_COUNT) {
            assignSeat(roomId, safeEnvironment, guest, seat);
        }
        roomRepository.save(room);
        return snapshot(roomId, safeEnvironment);
    }

    @Transactional(readOnly = true)
    public List<String> allRoomIds() {
        // Đảm bảo rạp chung luôn tồn tại dù chưa có ai kết nối.
        return roomRepository.findAllByOrderByIdAsc().stream().map(RoomEntity::getId)
                .filter(id -> !id.endsWith("__outdoor")).toList();
    }

    @Transactional(readOnly = true)
    public String roomIdForSession(String sessionId) {
        return guestRepository.findById(sessionId).map(GuestSessionEntity::getRoomId).orElse(null);
    }

    @Transactional
    public String leaveFromAnyRoom(String sessionId) {
        GuestSessionEntity guest = guestRepository.findById(sessionId).orElse(null);
        if (guest == null) {
            return null;
        }
        String roomId = guest.getRoomId();
        leave(roomId, sessionId);
        return roomId;
    }

    @Transactional
    public RoomState snapshot(String roomId) {
        return snapshot(roomId, "indoor");
    }

    @Transactional
    public RoomState snapshot(String roomId, String environment) {
        RoomEntity room = getRoom(roomId);
        String safeEnvironment = safeEnvironment(environment);
        String trackEnvironment = "gym".equals(safeEnvironment) ? "indoor" : safeEnvironment;
        String trackId = playbackRoomId(roomId, trackEnvironment);
        RoomEntity playbackRoom = getPlaybackRoom(roomId, trackEnvironment);
        List<Guest> guests = guestRepository.findByRoomIdAndEnvironmentOrderByJoinedAtAsc(roomId, safeEnvironment).stream()
                .map(GuestMapper::toDto).toList();
        List<VideoItem> queue = queueRepository.findByRoomIdOrderByQueuedAtAscIdAsc(trackId).stream()
                .map(item -> QueueMapper.toDto(item,
                        (int) queueVoteRepository.countByRoomIdAndVideoId(trackId, item.getVideoId())))
                .sorted(java.util.Comparator.comparingInt(VideoItem::votes).reversed())
                .toList();
        List<ChatMessageDto> chat = chatRepository.findTop100ByRoomIdOrderByTimeDesc(roomId).stream()
                .sorted(java.util.Comparator.comparingLong(ChatMessageEntity::getTime))
                .map(ChatMapper::toDto).toList();
        long guestCount = guestRepository.countByRoomIdAndEnvironment(roomId, safeEnvironment);
        int skipVotes = (int) skipVoteRepository.countByRoomId(trackId);
        String roomName = ROOM_ID.equals(roomId) ? "Rạp chung" : room.getName();
        return RoomMapper.toState(roomId, roomName,
                currentPlayback(playbackRoom, roomId, System.currentTimeMillis()), queue, guests,
                room.getHostId(), SEAT_COUNT, skipVotes, requiredSkipVotes(guestCount), chat);
    }

    @Transactional
    public Playback playbackSnapshot(String roomId) {
        return playbackSnapshot(roomId, "indoor");
    }

    @Transactional
    public Playback playbackSnapshot(String roomId, String environment) {
        return currentPlayback(getPlaybackRoom(roomId, environment), roomId, System.currentTimeMillis());
    }

    @Transactional
    public Playback startPersonalPlayback(String roomId, String sessionId, String mediaId, String title,
            String source, int durationSeconds, String environment) {
        if (!isRoomAvailable(roomId) || !guestRepository.existsByRoomIdAndId(roomId, sessionId)) {
            throw new IllegalArgumentException("Bạn cần ở trong phòng để chiếu nội dung cá nhân.");
        }
        String safeSource = "personal-image".equals(source) ? "personal-image" : "personal-video";
        String safeEnvironment = "outdoor".equalsIgnoreCase(environment) ? "outdoor" : "indoor";
        RoomEntity playbackRoom = getPlaybackRoom(roomId, safeEnvironment);
        String safeTitle = title == null || title.isBlank() ? "Nội dung cá nhân" : limit(title.strip(), 100);
        setPlayback(playbackRoom, mediaId, safeTitle, safeSource, 0, true);
        playbackRoom.setPlaybackDurationSeconds(Math.max(1, Math.min(10, durationSeconds)));
        roomRepository.save(playbackRoom);
        return currentPlayback(playbackRoom, roomId, System.currentTimeMillis());
    }

    @Transactional
    public boolean setEnvironment(String roomId, String sessionId, String environment) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null) return false;
        String target = safeEnvironment(environment);
        if (target.equals(guest.getEnvironment())) return true;
        guest.setEnvironment(target);
        guest.setSeat(null);
        guest.setX(.5);
        guest.setY(.78);
        guest.setFace(1);
        guest.setAction("idle");
        guest.setLastMoveAt(System.currentTimeMillis());
        guestRepository.save(guest);
        return true;
    }

    public Movement move(String roomId, String sessionId, Double requestedX, Double requestedY, Integer requestedFace,
            String environment) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || !safeEnvironment(environment).equals(guest.getEnvironment()) || requestedX == null || requestedY == null
                || !Double.isFinite(requestedX) || !Double.isFinite(requestedY)) {
            return null;
        }
        long now = System.currentTimeMillis();
        if (now - guest.getLastMoveAt() < 45) {
            return null;
        }
        boolean seatReleased = guest.getSeat() != null;
        guest.setSeat(null);
        guest.setAction("idle");
        guest.setX(clamp(requestedX, .04, .96));
        guest.setY(clamp(requestedY, .04, .96));
        guest.setFace(requestedFace != null && requestedFace < 0 ? -1 : 1);
        guest.setLastMoveAt(now);
        guestRepository.save(guest);
        return GuestMapper.toMovement(sessionId, guest.getX(), guest.getY(), guest.getFace(), seatReleased);
    }

    @Transactional
    public boolean claimSeat(String roomId, String sessionId, Integer seatIndex, String environment) {
        String safeEnvironment = safeEnvironment(environment);
        if (seatIndex == null || seatIndex < 0 || seatIndex >= SEAT_COUNT) {
            return false;
        }
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || !safeEnvironment.equals(guest.getEnvironment())
                || guestRepository.existsByRoomIdAndEnvironmentAndSeatAndIdNot(roomId, safeEnvironment, seatIndex, sessionId)) {
            return false;
        }
        return assignSeat(roomId, safeEnvironment, guest, seatIndex);
    }

    @Transactional
    public boolean setDanceAction(String roomId, String sessionId, String action, Integer returnSeat, String environment) {
        String safeEnvironment = safeEnvironment(environment);
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || !safeEnvironment.equals(guest.getEnvironment()) || action == null) return false;

        String safeAction = action.strip().toLowerCase(java.util.Locale.ROOT);
        if (!Set.of("idle", "sway", "bounce", "spin", "groove").contains(safeAction)) return false;

        guest.setAction(safeAction);
        if ("idle".equals(safeAction)) {
            guest.setSeat(null);
            if (returnSeat != null && returnSeat >= 0 && returnSeat < SEAT_COUNT
                    && !guestRepository.existsByRoomIdAndEnvironmentAndSeatAndIdNot(roomId, safeEnvironment, returnSeat, sessionId)) {
                assignSeat(roomId, safeEnvironment, guest, returnSeat);
            }
        } else {
            // Đưa người chơi ra khoảng sàn trống giữa rạp, chia thành các vị trí để avatar không chồng lên nhau.
            List<GuestSessionEntity> guests = guestRepository.findByRoomIdAndEnvironmentOrderByJoinedAtAsc(roomId, safeEnvironment);
            int slot = Math.max(0, guests.indexOf(guest));
            guest.setSeat(null);
            guest.setX(.36 + (slot % 3) * .14);
            guest.setY(.20 + ((slot / 3) % 5) * .12);
            guest.setFace(1);
        }
        guest.setLastMoveAt(System.currentTimeMillis());
        guestRepository.save(guest);
        return true;
    }

    private boolean assignSeat(String roomId, String environment, GuestSessionEntity guest, int seatIndex) {
        if (guestRepository.existsByRoomIdAndEnvironmentAndSeatAndIdNot(roomId, environment, seatIndex, guest.getId())) {
            return false;
        }
        if (seatIndex < BASE_SEAT_COUNT) {
            int row = seatIndex / SEAT_COLUMNS.size();
            int column = seatIndex % SEAT_COLUMNS.size();
            double depth = SEAT_DEPTHS.get(row);
            double minX = Math.max(.04, depth - .96);
            double maxX = Math.min(.96, depth - .04);
            guest.setX(minX + (maxX - minX) * SEAT_COLUMNS.get(column));
            guest.setY(depth - guest.getX());
        } else if (seatIndex < BASE_SEAT_COUNT + SIDE_SEAT_COUNT) {
            int sideSeat = seatIndex - BASE_SEAT_COUNT;
            int row = sideSeat / SIDE_SEAT_COLUMNS;
            int column = sideSeat % SIDE_SEAT_COLUMNS;
            double[] sideX = {.04, .12, .88, .96};
            double x = sideX[column];
            guest.setX(x);
            guest.setY(clamp(SEAT_DEPTHS.get(row) - x, .04, .96));
        } else if (seatIndex < BASE_SEAT_COUNT + SIDE_SEAT_COUNT + BACK_ROW_SEAT_COUNT) {
            int column = seatIndex - BASE_SEAT_COUNT - SIDE_SEAT_COUNT;
            double depth = SEAT_DEPTHS.get(SEAT_DEPTHS.size() - 1);
            double minX = Math.max(.04, depth - .96);
            double maxX = Math.min(.96, depth - .04);
            double x = minX + (maxX - minX) * SEAT_COLUMNS.get(column);
            guest.setX(x);
            guest.setY(clamp(depth - x, .04, .96));
        } else {
            int outerSeat = seatIndex - BASE_SEAT_COUNT - SIDE_SEAT_COUNT - BACK_ROW_SEAT_COUNT;
            int row = outerSeat / OUTER_SIDE_SEAT_COLUMNS;
            int column = outerSeat % OUTER_SIDE_SEAT_COLUMNS;
            double[] outerSideX = {.02, .10, .90, .98};
            double x = outerSideX[column];
            guest.setX(x);
            guest.setY(clamp(SEAT_DEPTHS.get(row) - x, .04, .96));
        }
        guest.setSeat(seatIndex);
        guest.setAction("idle");
        guestRepository.save(guest);
        return true;
    }

    @Transactional(readOnly = true)
    public Reaction reaction(String roomId, String sessionId, String emoji, String environment) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || !safeEnvironment(environment).equals(guest.getEnvironment()) || emoji == null || emoji.isBlank()) {
            return null;
        }
        long now = System.currentTimeMillis();
        return ReactionMapper.toDto(sessionId + "-" + now, emoji, guest.getAvatar(), guest.getName(),
                guest.getX(), guest.getY(), now);
    }

    @Transactional
    public ChatMessageDto chat(String roomId, String sessionId, String text, Integer vipTier) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || text == null || text.isBlank()) {
            return null;
        }
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
        chatRepository.saveAndFlush(entity);
        return ChatMapper.toDto(entity);
    }

    @Transactional(readOnly = true)
    public boolean canChat(String roomId, String sessionId) {
        return guestRepository.existsByRoomIdAndId(roomId, sessionId);
    }

    @Transactional
    public boolean updateProfile(String roomId, String sessionId, String name, String avatar,
            Integer shirtColorIndex, Integer accessoryIndex, Integer hairColorIndex, Integer ignoredVipTier,
            String gender, String shirtColor, Integer shirtTier) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null) {
            return false;
        }
        if (name != null && !name.isBlank()) {
            guest.setName(limit(name.strip(), 18));
        }
        if (avatar != null && AVATARS.contains(avatar)) {
            guest.setAvatar(avatar);
        }
        if (validIndex(shirtColorIndex)) {
            guest.setShirtColorIndex(shirtColorIndex);
        }
        if (validIndex(accessoryIndex)) {
            guest.setAccessoryIndex(accessoryIndex);
        }
        if (validIndex(hairColorIndex)) {
            guest.setHairColorIndex(hairColorIndex);
        }
        if (validGender(gender)) {
            guest.setGender(gender);
        }
        if (validShirtColor(shirtColor)) {
            guest.setShirtColor(shirtColor);
        }
        guest.setShirtTier(validShirtTier(shirtTier));
        guest.setVipTier(payments.approvedTier(guest.getUserId()));
        guestRepository.save(guest);
        return true;
    }

    private static boolean validGender(String gender) {
        return "male".equals(gender) || "female".equals(gender);
    }

    private static boolean validShirtColor(String color) {
        return color != null && color.matches("^#[0-9a-fA-F]{6}$");
    }

    private static int validShirtTier(Integer tier) {
        return tier == null ? 0 : Math.max(0, Math.min(6, tier));
    }

    @Transactional
    public RoomState addVideo(String roomId, String sessionId, String videoId, String title) {
        return addVideo(roomId, sessionId, videoId, title, "indoor");
    }

    @Transactional
    public RoomState addVideo(String roomId, String sessionId, String videoId, String title, String environment) {
        String trackId = playbackRoomId(roomId, environment);
        RoomEntity room = getPlaybackRoom(roomId, environment);
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null) {
            throw new IllegalArgumentException("Hãy vào phòng trước khi gửi video.");
        }
        if (videoId == null || !VIDEO_ID.matcher(videoId).matches()) {
            throw new IllegalArgumentException("Video ID YouTube không hợp lệ.");
        }
        if (room.getPlaybackVideoId().equals(videoId) || queueRepository.existsByRoomIdAndVideoId(trackId, videoId)) {
            throw new IllegalArgumentException("Video này đã có trong phòng.");
        }
        String safeTitle = title == null || title.isBlank() ? "Video YouTube" : limit(title, 100);
        if ("lofi".equals(room.getPlaybackSource())) {
            skipVoteRepository.deleteByRoomId(trackId);
            setPlayback(room, videoId, safeTitle, "queue", 0, true);
            // Lưu video đầu tiên vào trạng thái playback bền vững trong PostgreSQL.
            roomRepository.saveAndFlush(room);
        } else {
            queueRepository.saveAndFlush(QueueVideoEntity.builder().id(UUID.randomUUID().toString()).roomId(trackId)
                    .videoId(videoId).title(safeTitle).requestedBy(guest.getName())
                    .queuedAt(System.currentTimeMillis()).build());
        }
        return snapshot(roomId, environment);
    }

    @Transactional
    public boolean updateVideoTitle(String roomId, String sessionId, String videoId, String title) {
        return updateVideoTitle(roomId, sessionId, videoId, title, "indoor");
    }

    @Transactional
    public boolean updateVideoTitle(String roomId, String sessionId, String videoId, String title, String environment) {
        if (guestRepository.findFirstByRoomIdAndId(roomId, sessionId).isEmpty()
                || videoId == null || !VIDEO_ID.matcher(videoId).matches()
                || title == null || title.isBlank()) {
            return false;
        }

        String safeTitle = limit(title.strip(), 100);
        boolean changed = false;
        String trackId = playbackRoomId(roomId, environment);
        RoomEntity room = getPlaybackRoom(roomId, environment);
        if (videoId.equals(room.getPlaybackVideoId()) && "queue".equals(room.getPlaybackSource())) {
            if (!safeTitle.equals(room.getPlaybackTitle())) {
                room.setPlaybackTitle(safeTitle);
                roomRepository.save(room);
                changed = true;
            }
        }

        QueueVideoEntity queuedVideo = queueRepository.findByRoomIdAndVideoId(trackId, videoId).orElse(null);
        if (queuedVideo != null && !safeTitle.equals(queuedVideo.getTitle())) {
            queuedVideo.setTitle(safeTitle);
            queueRepository.save(queuedVideo);
            changed = true;
        }
        return changed;
    }

    @Transactional
    public boolean voteQueueVideo(String roomId, String sessionId, String videoId) {
        return voteQueueVideo(roomId, sessionId, videoId, "indoor");
    }

    @Transactional
    public boolean voteQueueVideo(String roomId, String sessionId, String videoId, String environment) {
        String trackId = playbackRoomId(roomId, environment);
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null || videoId == null || !VIDEO_ID.matcher(videoId).matches()
                || !queueRepository.existsByRoomIdAndVideoId(trackId, videoId)) {
            return false;
        }

        String voterId = guest.getUserId() == null || guest.getUserId().isBlank()
                ? "session:" + guest.getId()
                : "user:" + guest.getUserId();
        return queueVoteRepository.insertVoteIfAbsent(UUID.randomUUID().toString(), trackId, videoId,
                voterId, System.currentTimeMillis()) == 1;
    }

    @Transactional
    public boolean voteSkip(String roomId, String sessionId) {
        return voteSkip(roomId, sessionId, "indoor");
    }

    @Transactional
    public boolean voteSkip(String roomId, String sessionId, String environment) {
        String safeEnvironment = safeEnvironment(environment);
        String trackEnvironment = "gym".equals(safeEnvironment) ? "indoor" : safeEnvironment;
        String trackId = playbackRoomId(roomId, trackEnvironment);
        if (guestRepository.findFirstByRoomIdAndId(roomId, sessionId)
                .filter(guest -> safeEnvironment.equals(guest.getEnvironment())).isEmpty()
                || skipVoteRepository.existsByRoomIdAndSessionId(trackId, sessionId)) {
            return false;
        }
        skipVoteRepository.save(SkipVoteEntity.builder().id(UUID.randomUUID().toString())
                .roomId(trackId).sessionId(sessionId).build());
        if (skipVoteRepository.countByRoomId(trackId) >= requiredSkipVotes(guestRepository.countByRoomIdAndEnvironment(roomId, safeEnvironment))) {
            RoomEntity playbackRoom = getPlaybackRoom(roomId, trackEnvironment);
            advance(trackId, playbackRoom);
            roomRepository.save(playbackRoom);
        }
        return true;
    }

    @Transactional
    public Playback command(String roomId, String sessionId, String action, Boolean playing, Double position) {
        return command(roomId, sessionId, action, playing, position, "indoor");
    }

    @Transactional
    public Playback command(String roomId, String sessionId, String action, Boolean playing, Double position,
            String environment) {
        String trackId = playbackRoomId(roomId, environment);
        RoomEntity room = getPlaybackRoom(roomId, environment);
        RoomEntity roomAccess = getRoom(roomId);
        String safeAction = action == null ? "" : action;
        if ("ended".equals(safeAction)) {
            if (sessionId == null || !sessionId.equals(roomAccess.getHostId())) {
                return null;
            }
            advance(trackId, room);
            roomRepository.save(room);
        } else if (("toggle".equals(safeAction) || "seek".equals(safeAction))
                && sessionId != null && sessionId.equals(roomAccess.getHostId())) {
            double safePosition = validPosition(position, room, roomId);
            boolean nextPlaying = "toggle".equals(safeAction) ? Boolean.TRUE.equals(playing) : room.isPlaybackPlaying();
            setPlayback(room, room.getPlaybackVideoId(), room.getPlaybackTitle(), room.getPlaybackSource(),
                    safePosition, nextPlaying);
            roomRepository.save(room);
        } else if (!"toggle".equals(safeAction) && !"seek".equals(safeAction)) {
            return null;
        }
        return currentPlayback(room, roomId, System.currentTimeMillis());
    }

    @Transactional
    public boolean leave(String roomId, String sessionId) {
        GuestSessionEntity guest = guestRepository.findFirstByRoomIdAndId(roomId, sessionId).orElse(null);
        if (guest == null) {
            return false;
        }
        guestRepository.delete(guest);
        skipVoteRepository.deleteByRoomIdAndSessionId(roomId, sessionId);
        skipVoteRepository.deleteByRoomIdAndSessionId(playbackRoomId(roomId, "outdoor"), sessionId);
        RoomEntity room = getRoom(roomId);
        if (sessionId.equals(room.getHostId())) {
            room.setHostId(guestRepository.findFirstByRoomIdOrderByJoinedAtAsc(roomId)
                    .map(GuestSessionEntity::getId).orElse(null));
            roomRepository.save(room);
        }
        long guestCount = guestRepository.countByRoomId(roomId);
        for (String environment : List.of("indoor", "outdoor")) {
            String trackId = playbackRoomId(roomId, environment);
            if (skipVoteRepository.countByRoomId(trackId) >= requiredSkipVotes(guestCount)) {
                RoomEntity playbackRoom = getPlaybackRoom(roomId, environment);
                advance(trackId, playbackRoom);
                roomRepository.save(playbackRoom);
            }
        }
        return true;
    }

    @Transactional
    public void nextVideo(String roomId) {
        nextVideo(roomId, "indoor");
    }

    @Transactional
    public void nextVideo(String roomId, String environment) {
        String trackId = playbackRoomId(roomId, environment);
        RoomEntity room = getPlaybackRoom(roomId, environment);
        advance(trackId, room);
        roomRepository.save(room);
    }

    private void advance(String roomId, RoomEntity room) {
        skipVoteRepository.deleteByRoomId(roomId);
        QueueVideoEntity next = queueRepository.findByRoomIdOrderByQueuedAtAscIdAsc(roomId).stream()
                .sorted(java.util.Comparator
                        .comparingLong((QueueVideoEntity item)
                                -> queueVoteRepository.countByRoomIdAndVideoId(roomId, item.getVideoId()))
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
        if (roomId == null) {
            throw new IllegalArgumentException("Không tìm thấy phòng.");
        }
        RoomEntity room = roomRepository.findById(roomId).orElse(null);
        if (room != null) {
            // `jfKfPfyJRdk` is a valid lofi track; never reset a playing room just because
            // that track is active. Reset only genuinely missing/blank playback IDs.
            if (room.getPlaybackVideoId() == null || room.getPlaybackVideoId().isBlank()) {
                setPlayback(room, LOFI.get(0), LOFI_TITLES.get(0), "lofi", 0, true);
                room.setLofiIndex(0);
                return roomRepository.save(room);
            }
            return room;
        }
        if (!ROOM_ID.equals(roomId) && !payments.isPrivateRoom(roomId)) {
            throw new IllegalArgumentException("Không tìm thấy phòng riêng hoặc phòng chưa được duyệt.");
        }
        int lofiIndex = ROOM_ID.equals(roomId) ? 0 : payments.privateRoomLofiIndex(roomId);
        String roomName = ROOM_ID.equals(roomId) ? "Rạp chung" : payments.privateRoomName(roomId);
        RoomEntity newRoom = RoomEntity.builder()
                .id(roomId)
                .name(roomName)
                .playbackVideoId(LOFI.get(lofiIndex))
                .playbackTitle(LOFI_TITLES.get(lofiIndex))
                .playbackSource("lofi")
                .playbackPosition(0)
                .playbackPlaying(true)
                .playbackUpdatedAt(System.currentTimeMillis())
                .lofiIndex(lofiIndex)
                .build();
        return roomRepository.save(newRoom);
    }

    private static int requiredSkipVotes(long guests) {
        return (int) Math.ceil(Math.max(1, guests) * .90);
    }

    private RoomEntity getPlaybackRoom(String roomId, String environment) {
        RoomEntity room = getRoom(roomId);
        String trackId = playbackRoomId(roomId, environment);
        if (trackId.equals(roomId)) {
            return room;
        }

        RoomEntity track = roomRepository.findById(trackId).orElse(null);
        if (track != null) {
            return track;
        }

        int lofiIndex = (room.getLofiIndex() + 1) % LOFI.size();
        RoomEntity outdoorTrack = RoomEntity.builder()
                .id(trackId)
                .name(room.getName())
                .playbackVideoId(LOFI.get(lofiIndex))
                .playbackTitle(LOFI_TITLES.get(lofiIndex))
                .playbackSource("lofi")
                .playbackPosition(0)
                .playbackPlaying(true)
                .playbackUpdatedAt(System.currentTimeMillis())
                .lofiIndex(lofiIndex)
                .build();
        return roomRepository.save(outdoorTrack);
    }

    private static String playbackRoomId(String roomId, String environment) {
        if (roomId == null) {
            throw new IllegalArgumentException("Không tìm thấy phòng.");
        }
        return "outdoor".equalsIgnoreCase(environment) ? roomId + "__outdoor" : roomId;
    }

    private static Playback currentPlayback(RoomEntity room, String publicRoomId, long now) {
        double elapsed = (room.isPlaybackPlaying() ? Math.max(0, now - room.getPlaybackUpdatedAt()) / 1000.0 : 0);
        double position = room.getPlaybackPosition() + elapsed;
        // Nếu là luồng lofi tự động phát, tính trôi thời gian theo độ dài bài hát (~260s)
        // để tránh position vượt quá độ dài video khiến YouTube hiển thị màn hình đen (video ended)
        if ("lofi".equals(room.getPlaybackSource())) {
            final double trackLength = 260.0;
            if (position >= trackLength) {
                int tracksAhead = (int) (position / trackLength);
                int newIndex = ((room.getLofiIndex() + tracksAhead) % LOFI.size());
                position = position % trackLength;
                room.setLofiIndex(newIndex);
                room.setPlaybackVideoId(LOFI.get(newIndex));
                room.setPlaybackTitle(LOFI_TITLES.get(newIndex));
                room.setPlaybackPosition(position);
                room.setPlaybackUpdatedAt(now);
            }
        }
        return PlaybackMapper.toDto(publicRoomId, room.getPlaybackVideoId(), room.getPlaybackTitle(),
                room.getPlaybackSource(), position, room.isPlaybackPlaying(), room.getPlaybackUpdatedAt(), now,
                room.getPlaybackDurationSeconds());
    }

    private static void setPlayback(RoomEntity room, String videoId, String title, String source,
            double position, boolean playing) {
        room.setPlaybackVideoId(videoId);
        room.setPlaybackTitle(title);
        room.setPlaybackSource(source);
        room.setPlaybackPosition(position);
        room.setPlaybackPlaying(playing);
        room.setPlaybackUpdatedAt(System.currentTimeMillis());
        room.setPlaybackDurationSeconds(0);
    }

    private double validPosition(Double position, RoomEntity room, String publicRoomId) {
        if (position == null || !Double.isFinite(position)) {
            return currentPlayback(room, publicRoomId, System.currentTimeMillis()).position();
        }
        return Math.max(0, position);
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

    private static String safeEnvironment(String environment) {
        if ("outdoor".equalsIgnoreCase(environment)) return "outdoor";
        if ("gym".equalsIgnoreCase(environment)) return "gym";
        return "indoor";
    }
}
