package com.healingcinema.tasks.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.donation.service.DonationConfigService;
import com.healingcinema.room.chat.repository.ChatMessageRepository;
import com.healingcinema.room.guest.repository.GuestSessionRepository;
import com.healingcinema.tasks.dto.Definition;
import com.healingcinema.tasks.dto.TaskDtos.Progress;
import com.healingcinema.tasks.dto.TaskDtos.Task;
import com.healingcinema.tasks.entity.UserTaskClaimEntity;
import com.healingcinema.tasks.mapper.TaskMapper;
import com.healingcinema.tasks.repository.UserTaskClaimRepository;
import com.healingcinema.wardrobe.repository.WardrobePurchaseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TaskService {

    private static final int EXP_PER_LEVEL = 300;
    private static final ZoneId TASK_DAY_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<Definition> TASKS = List.of(
            new Definition("seat", "Chọn chỗ ngồi", "Ngồi vào một ghế trong phòng chiếu.", 50),
            new Definition("style", "Tạo dấu ấn riêng", "Chọn màu áo hoặc tên riêng cho nhân vật.", 50),
            new Definition("chat", "Gửi lời chào đầu tiên", "Gửi tin nhắn đầu tiên trong khung chat.", 50),
            new Definition("donation", "Ủng hộ rạp", "Hoàn thành một khoản ủng hộ được admin duyệt.", 100),
            new Definition("wardrobe", "Mở món đồ đầu tiên", "Mua một vật phẩm trong tủ đồ.", 100));

    private final UserRepository users;
    private final UserTaskClaimRepository claims;
    private final GuestSessionRepository guests;
    private final ChatMessageRepository chatMessages;
    private final WardrobePurchaseRepository wardrobePurchases;
    private final DonationConfigService donationConfig;

    @Transactional(readOnly = true)
    public Progress getProgress(String userId) {
        UserEntity user = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));
        return buildProgress(user, taskDay());
    }

    @Transactional
    public Progress claim(String userId, String taskId) {
        UserEntity user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));
        Definition task = TASKS.stream().filter(item -> item.id().equals(taskId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Nhiệm vụ không hợp lệ."));
        LocalDate today = taskDay();
        if (claims.existsByUserIdAndTaskIdAndClaimDate(userId, taskId, today)) {
            throw new IllegalArgumentException("Bạn đã nhận EXP của nhiệm vụ này hôm nay rồi.");
        }
        if (!isEligible(user, taskId)) {
            throw new IllegalArgumentException("Bạn chưa hoàn thành nhiệm vụ này.");
        }

        claims.save(UserTaskClaimEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .taskId(taskId)
                .claimDate(today)
                .expAwarded(task.rewardExp())
                .claimedAt(System.currentTimeMillis())
                .build());
        user.setExperiencePoints(user.getExperiencePoints() + task.rewardExp());
        return buildProgress(users.save(user), today);
    }

    private Progress buildProgress(UserEntity user, LocalDate today) {
        Set<String> claimedIds = claims.findByUserIdAndClaimDate(user.getId(), today).stream()
                .map(UserTaskClaimEntity::getTaskId).collect(Collectors.toSet());
        List<Task> tasks = TASKS.stream().map(task -> {
            boolean claimed = claimedIds.contains(task.id());
            return TaskMapper.toTask(task.id(), task.title(), task.description(), task.rewardExp(),
                    !claimed && isEligible(user, task.id()), claimed);
        }).toList();
        long total = Math.max(0, user.getExperiencePoints());
        return TaskMapper.toProgress(total, EXP_PER_LEVEL, tasks);
    }

    private LocalDate taskDay() {
        return LocalDate.now(TASK_DAY_ZONE);
    }

    private boolean isEligible(UserEntity user, String taskId) {
        return switch (taskId) {
            case "seat" ->
                guests.existsByUserIdAndSeatIsNotNull(user.getId());
            case "style" ->
                user.getShirtColorIndex() != 0
                || !user.getDisplayName().equalsIgnoreCase(user.getUsername());
            case "chat" ->
                guests.findByUserId(user.getId()).stream()
                .anyMatch(guest -> chatMessages.existsBySenderId(guest.getId()));
            case "donation" ->
                user.getDonationTotalConfirmed() >= donationConfig.getConfig().lightAmount();
            case "wardrobe" ->
                wardrobePurchases.existsByUserId(user.getId());
            default ->
                false;
        };
    }

}
