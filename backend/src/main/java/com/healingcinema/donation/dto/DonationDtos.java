package com.healingcinema.donation.dto;

import java.util.List;

public final class DonationDtos {
    private DonationDtos() {}

    public record Tier(String id, String name, int amount, String color) {}

    public record Config(String bank, String bankCode, String accountNumber, String accountName,
            String zaloUrl, int lightAmount, List<Tier> tiers) {}

    public record Account(String transferCode, long totalConfirmed, long usableBalance,
            Tier currentTier, Tier nextTier, long remainingToNext, boolean pending, int pendingAmount,
            String latestStatus) {}

    public record CreateRequest(String userId, String authToken, int amount) {}

    public record Submission(Object request, Account account) {}
}
