package com.healingcinema.auth.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.dto.AdminUserDtos.UpdateUserRequest;
import com.healingcinema.auth.dto.AdminUserDtos.UserView;
import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.mapper.AdminUserMapper;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.auth.repository.UserSessionRepository;
import com.healingcinema.media.service.PersonalMediaService;
import com.healingcinema.room.guest.repository.GuestSessionRepository;
import com.healingcinema.room.service.RoomService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private static final int MAX_VIP_TIER = 10;

    private final UserRepository users;
    private final UserSessionRepository sessions;
    private final GuestSessionRepository guests;
    private final RoomService rooms;
    private final PersonalMediaService personalMedia;

    @Transactional
    public UserView update(String userId, UpdateUserRequest request) {
        if (request == null) throw new IllegalArgumentException("Dữ liệu cập nhật không hợp lệ.");
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        String username = request.username() == null ? "" : request.username().strip();
        if (username.length() < 3 || username.length() > 24) {
            throw new IllegalArgumentException("Tên đăng nhập phải từ 3 đến 24 ký tự.");
        }
        if (users.existsByUsernameIgnoreCaseAndIdNot(username, userId)) {
            throw new IllegalArgumentException("Tên đăng nhập này đã được sử dụng.");
        }

        String displayName = request.displayName() == null ? "" : request.displayName().strip();
        if (displayName.isBlank() || displayName.length() > 20) {
            throw new IllegalArgumentException("Tên hiển thị phải từ 1 đến 20 ký tự.");
        }
        String avatar = request.avatar() == null ? "" : request.avatar().strip();
        if (avatar.isBlank() || avatar.length() > 32) {
            throw new IllegalArgumentException("Avatar không được để trống và tối đa 32 ký tự.");
        }
        if (request.vipTier() == null || request.vipTier() < 0 || request.vipTier() > MAX_VIP_TIER) {
            throw new IllegalArgumentException("Cấp VIP phải nằm trong khoảng 0 đến 10.");
        }

        user.setUsername(username);
        user.setDisplayName(displayName);
        user.setAvatar(avatar);
        user.setVipTier(request.vipTier());
        return AdminUserMapper.toView(users.save(user));
    }

    @Transactional
    public DeleteResult delete(String userId) {
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));

        List<String> affectedRooms = guests.findByUserId(userId).stream()
                .map(guest -> {
                    rooms.leave(guest.getRoomId(), guest.getId());
                    return guest.getRoomId();
                })
                .distinct()
                .toList();

        sessions.deleteByUserId(userId);
        personalMedia.deleteUploadsForUser(userId);
        users.delete(user);
        // Payment requests are kept as financial/admin history; room presence, login sessions,
        // wardrobe, task claims, and uploaded media are removed with the account.
        return new DeleteResult(true, affectedRooms);
    }

    public record DeleteResult(boolean deleted, List<String> affectedRooms) {}
}
