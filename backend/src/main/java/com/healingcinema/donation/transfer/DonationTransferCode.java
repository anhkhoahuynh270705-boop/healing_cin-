package com.healingcinema.donation.transfer;

 public final class DonationTransferCode {
    private DonationTransferCode() {}

    public static String forUser(String userId) {
        String compactId = userId.replace("-", "").toUpperCase();
        return "HEALING " + compactId.substring(0, Math.min(16, compactId.length())) + " UNG HO";
    }
}
