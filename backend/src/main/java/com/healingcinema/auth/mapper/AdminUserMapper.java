package com.healingcinema.auth.mapper;

import org.springframework.data.domain.Page;

import com.healingcinema.auth.dto.AdminUserDtos.UserPage;
import com.healingcinema.auth.dto.AdminUserDtos.UserView;
import com.healingcinema.auth.entity.UserEntity;

/** Mapper cho dữ liệu tài khoản trong màn quản trị. */
public final class AdminUserMapper {
    private AdminUserMapper() {}

    public static UserView toView(UserEntity user) {
        return new UserView(user.getId(), user.getUsername(), user.getDisplayName(), user.getAvatar(),
                user.getVipTier(), user.getCreatedAt());
    }

    public static UserPage toPage(Page<UserEntity> page) {
        return new UserPage(page.getContent().stream().map(AdminUserMapper::toView).toList(),
                page.getTotalElements(), page.getTotalPages(), page.getNumber(), page.getSize());
    }
}
