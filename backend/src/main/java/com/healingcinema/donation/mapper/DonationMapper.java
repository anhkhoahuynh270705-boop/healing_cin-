package com.healingcinema.donation.mapper;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.donation.DonationDtos.Account;
import com.healingcinema.donation.DonationDtos.Tier;

/** Mapper phản hồi tài khoản ủng hộ. */
public final class DonationMapper {
    private DonationMapper() {}

    public static Account toAccount(UserEntity user, Tier currentTier, Tier nextTier, long remainingToNext,
            boolean pending, int pendingAmount, String latestStatus) {
        return new Account(user.getDonationTransferCode(), user.getDonationTotalConfirmed(),
                user.getDonationUsableBalance(), currentTier, nextTier, remainingToNext,
                pending, pendingAmount, latestStatus);
    }
}
