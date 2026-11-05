package com.healingcinema.auth.dto;

import java.util.List;

public final class AdminUserDtos {
    private AdminUserDtos() {}

    public record UserView(String id, String username, String displayName, String avatar,
            int vipTier, long createdAt) {}

    public record UserPage(List<UserView> content, long totalElements, int totalPages, int number, int size) {}
}
