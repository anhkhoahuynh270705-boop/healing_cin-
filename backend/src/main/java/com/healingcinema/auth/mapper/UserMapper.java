package com.healingcinema.auth.mapper;

import com.healingcinema.auth.dto.AuthDtos.UserProfile;
import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.service.VipLevelPolicy;

/** Chuyển dữ liệu tài khoản giữa entity và DTO. */
public final class UserMapper {
    private UserMapper() {}

    public static UserProfile toProfile(UserEntity user) {
        if (user == null) return null;
        return new UserProfile(user.getId(), user.getUsername(), user.getDisplayName(), user.getAvatar(),
                user.getShirtColorIndex(), user.getAccessoryIndex(), user.getHairColorIndex(),
                Math.max(user.getVipTier(), VipLevelPolicy.forConfirmedAmount(user.getDonationTotalConfirmed())),
                user.getCreatedAt());
    }
}
