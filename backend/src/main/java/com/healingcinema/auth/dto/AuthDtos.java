package com.healingcinema.auth.dto;

public final class AuthDtos {

        private AuthDtos() {
        }

        public record RegisterRequest(String username, String password, String displayName) {
        }

        public record LoginRequest(String username, String password) {
        }

        public record ProfileRequest(String userId, String displayName, String avatar, Integer shirtColorIndex,
                        Integer accessoryIndex, Integer hairColorIndex, Integer vipTier) {
        }

        public record UpgradeVipRequest(String userId, int vipTier, int amount) {
        }

        public record UserProfile(
                        String id,
                        String username,
                        String displayName,
                        String avatar,
                        int shirtColorIndex,
                        int accessoryIndex,
                        int hairColorIndex,
                        int vipTier,
                        long createdAt) {
        }

        public record AuthResponse(
                        boolean success,
                        String message,
                        String token,
                        UserProfile user) {
        }
}
