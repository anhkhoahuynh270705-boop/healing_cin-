package com.healingcinema.media;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.media.MediaDtos.UploadResponse;
import com.healingcinema.media.entity.PersonalMediaEntity;
import com.healingcinema.media.repository.PersonalMediaRepository;
import com.healingcinema.room.guest.entity.GuestSessionEntity;
import com.healingcinema.room.guest.repository.GuestSessionRepository;
import com.healingcinema.room.service.RoomService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PersonalMediaService {
    private static final long PRICE_PER_SECOND = 5_000L;
    private static final long MAX_FILE_BYTES = 20L * 1024 * 1024;

    private final PersonalMediaRepository media;
    private final UserRepository users;
    private final GuestSessionRepository guests;
    private final RoomService rooms;

    @Value("${app.media.storage-dir:./storage/media}")
    private String storageDirectory;

    @Transactional
    public UploadResponse upload(String userId, String guestSessionId, String roomId, String environment,
            int durationSeconds, MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("Chọn một ảnh hoặc video tối đa 20 MB.");
        }
        if (durationSeconds < 1 || durationSeconds > 10) {
            throw new IllegalArgumentException("Thời lượng chiếu phải từ 1 đến 10 giây.");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        boolean image = contentType.equals("image/jpeg") || contentType.equals("image/png")
                || contentType.equals("image/webp");
        boolean video = contentType.equals("video/mp4") || contentType.equals("video/webm");
        if (!image && !video) {
            throw new IllegalArgumentException("Định dạng hỗ trợ: JPG, PNG, WEBP, MP4 hoặc WEBM.");
        }
        GuestSessionEntity guest = guests.findFirstByRoomIdAndId(roomId, guestSessionId).orElse(null);
        if (guest == null || !userId.equals(guest.getUserId()) || !rooms.isRoomAvailable(roomId)) {
            throw new IllegalArgumentException("Bạn cần đăng nhập và ở trong phòng để tải nội dung lên.");
        }

        UserEntity user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));
        long amount = PRICE_PER_SECOND * durationSeconds;
        if (user.getDonationUsableBalance() < amount) {
            throw new IllegalArgumentException("Số dư không đủ. Nội dung này cần " + amount + "đ.");
        }

        String id = UUID.randomUUID().toString().replace("-", "");
        String extension = extensionFor(contentType);
        String storageName = id + extension;
        String title = safeTitle(file.getOriginalFilename());
        String targetEnvironment = "outdoor".equalsIgnoreCase(environment) ? "outdoor" : "indoor";
        Path directory = Path.of(storageDirectory).toAbsolutePath().normalize();
        Path target = directory.resolve(storageName).normalize();
        if (!target.startsWith(directory)) throw new IllegalArgumentException("Tên tệp không hợp lệ.");

        try {
            Files.createDirectories(directory);
            file.transferTo(target);
            PersonalMediaEntity record = media.save(PersonalMediaEntity.builder()
                    .id(id).roomId(roomId).environment(targetEnvironment).uploadedBy(userId)
                    .originalName(title).contentType(contentType).storageName(storageName)
                    .durationSeconds(durationSeconds).chargedAmount(amount)
                    .uploadedAt(System.currentTimeMillis()).build());
            user.setDonationUsableBalance(user.getDonationUsableBalance() - amount);
            users.save(user);
            rooms.startPersonalPlayback(roomId, guestSessionId, record.getId(), title,
                    image ? "personal-image" : "personal-video", durationSeconds, targetEnvironment);
            return new UploadResponse(id, title, contentType, durationSeconds, amount,
                    user.getDonationUsableBalance());
        } catch (IOException | RuntimeException error) {
            try { Files.deleteIfExists(target); } catch (IOException ignored) {}
            throw error instanceof RuntimeException runtime ? runtime
                    : new IllegalArgumentException("Không lưu được tệp tải lên.");
        }
    }

    @Transactional(readOnly = true)
    public PersonalMediaEntity find(String id) {
        return media.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy nội dung."));
    }

    public Path filePath(PersonalMediaEntity item) {
        return Path.of(storageDirectory).toAbsolutePath().normalize().resolve(item.getStorageName()).normalize();
    }

    private static String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "video/mp4" -> ".mp4";
            case "video/webm" -> ".webm";
            default -> throw new IllegalArgumentException("Định dạng tệp không được hỗ trợ.");
        };
    }

    private static String safeTitle(String originalName) {
        if (originalName == null || originalName.isBlank()) return "Nội dung cá nhân";
        String name = Path.of(originalName).getFileName().toString().replaceAll("[\\p{Cntrl}]", "").strip();
        if (name.isBlank()) return "Nội dung cá nhân";
        return name.length() > 120 ? name.substring(0, 120) : name;
    }
}
