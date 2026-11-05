package com.healingcinema.storage;

import java.util.UUID;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.AdminSessionRepository;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.auth.repository.UserSessionRepository;
import com.healingcinema.auth.service.PasswordHashService;
import com.healingcinema.donation.transfer.DonationTransferCode;
import com.healingcinema.room.entity.RoomEntity;
import com.healingcinema.room.guest.repository.GuestSessionRepository;
import com.healingcinema.room.repository.RoomRepository;
import com.healingcinema.room.playback.repository.SkipVoteRepository;

/** Khởi tạo rạp chung và dọn presence/vote còn sót sau khi process cũ dừng đột ngột. */
@Component
@Order(1)
@RequiredArgsConstructor
public class DatabaseBootstrapRunner implements ApplicationRunner {

    private static final String DEFAULT_ROOM_ID = "rap-chua-lanh";
    private static final String DEFAULT_VIDEO_ID = "jfKfPfyJRdk";
    private final UserRepository users;
    private final UserSessionRepository userSessions;
    private final AdminSessionRepository adminSessions;
    private final RoomRepository rooms;
    private final GuestSessionRepository guests;
    private final SkipVoteRepository skipVotes;
    private final PasswordHashService passwordHasher;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedDemoAccount();
        seedPublicRoom();
        guests.deleteAllInBatch();
        skipVotes.deleteAllInBatch();
        rooms.findAll().forEach(room -> {
            room.setHostId(null);
            rooms.save(room);
        });
        long now = System.currentTimeMillis();
        userSessions.deleteByExpiresAtLessThan(now);
        adminSessions.deleteByExpiresAtLessThan(now);
    }

    private void seedDemoAccount() {
        if (users.existsByUsernameIgnoreCase("demo")) return;
        PasswordHashService.HashedPassword password = passwordHasher.hash("123456");
        String userId = UUID.randomUUID().toString();
        users.save(UserEntity.builder().id(userId).username("demo")
                .passwordSalt(password.salt()).passwordHash(password.hash()).displayName("Khán giả VIP")
                .avatar("🦊").shirtColorIndex(0).accessoryIndex(0).hairColorIndex(0).vipTier(1)
                .donationTransferCode(DonationTransferCode.forUser(userId))
                .donationTotalConfirmed(0).donationUsableBalance(0).experiencePoints(0)
                .createdAt(System.currentTimeMillis()).build());
    }

    private void seedPublicRoom() {
        if (rooms.existsById(DEFAULT_ROOM_ID)) return;
        rooms.save(RoomEntity.builder().id(DEFAULT_ROOM_ID).name("Rạp chung")
                .playbackVideoId(DEFAULT_VIDEO_ID).playbackTitle("Lofi Girl — beats to relax/study to")
                .playbackSource("lofi").playbackPosition(0).playbackPlaying(true)
                .playbackUpdatedAt(System.currentTimeMillis()).lofiIndex(0).build());
    }
}
