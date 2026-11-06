package com.healingcinema.auth.service;

public final class VipLevelPolicy {

    private static final long[] THRESHOLDS = {
        0L, 10_000L, 20_000L, 50_000L, 100_000L, 200_000L,
        500_000L, 1_000_000L, 2_000_000L, 5_000_000L, 10_000_000L
    };

    private VipLevelPolicy() {
    }

    public static int forConfirmedAmount(long amount) {
        int index = java.util.Arrays.binarySearch(THRESHOLDS, amount);
        return index >= 0 ? Math.min(index, 10) : Math.max(0, Math.min(10, -index - 2));
    }
}
