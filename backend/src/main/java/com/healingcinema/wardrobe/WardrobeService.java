package com.healingcinema.wardrobe;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.auth.repository.UserRepository;
import com.healingcinema.payment.service.PaymentApprovalService;
import com.healingcinema.wardrobe.WardrobeDtos.Account;
import com.healingcinema.wardrobe.WardrobeDtos.CatalogItem;
import com.healingcinema.wardrobe.entity.WardrobeCatalogItemEntity;
import com.healingcinema.wardrobe.entity.WardrobePurchaseEntity;
import com.healingcinema.wardrobe.mapper.WardrobeMapper;
import com.healingcinema.wardrobe.repository.WardrobeCatalogRepository;
import com.healingcinema.wardrobe.repository.WardrobePurchaseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WardrobeService {
    private final WardrobeCatalogRepository catalog;
    private final WardrobePurchaseRepository purchases;
    private final UserRepository users;
    private final PaymentApprovalService payments;

    @Transactional(readOnly = true)
    public List<CatalogItem> catalog() {
        return catalog.findAllByOrderByTierAsc().stream()
                .map(item -> WardrobeMapper.toCatalogItem(item, item.getTier() == 0, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public Account account(String userId) {
        UserEntity user = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));
        List<WardrobePurchaseEntity> ownedPurchases = purchases.findByUserIdOrderByTierAsc(userId);
        int ownedThroughTier = Math.max(
                ownedPurchases.stream().mapToInt(WardrobePurchaseEntity::getTier).max().orElse(0),
                payments.approvedTier(userId));
        Map<Integer, Long> purchasedAt = ownedPurchases.stream().collect(Collectors.toMap(
                WardrobePurchaseEntity::getTier, WardrobePurchaseEntity::getPurchasedAt, (first, ignored) -> first));
        List<CatalogItem> items = catalog.findAllByOrderByTierAsc().stream()
                .map(item -> WardrobeMapper.toCatalogItem(item, item.getTier() <= ownedThroughTier,
                        item.getTier() == 0 ? null : purchasedAt.get(item.getTier())))
                .toList();
        return WardrobeMapper.toAccount(user, ownedThroughTier, items);
    }

    @Transactional
    public Account purchase(String userId, int tier) {
        if (tier < 1) throw new IllegalArgumentException("Bộ mặc định đã được mở sẵn.");
        UserEntity user = users.findByIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản."));
        WardrobeCatalogItemEntity item = catalog.findById(tier)
                .orElseThrow(() -> new IllegalArgumentException("Bậc vật phẩm không hợp lệ."));

        int ownedThroughTier = Math.max(
                purchases.findFirstByUserIdOrderByTierDesc(userId).map(WardrobePurchaseEntity::getTier).orElse(0),
                payments.approvedTier(userId));
        if (tier <= ownedThroughTier) return account(userId);
        if (user.getDonationUsableBalance() < item.getPrice()) {
            throw new IllegalArgumentException("Số dư có thể sử dụng không đủ để mua bộ " + item.getName() + ".");
        }

        long purchasedAt = System.currentTimeMillis();
        user.setDonationUsableBalance(user.getDonationUsableBalance() - item.getPrice());
        users.save(user);
        purchases.save(WardrobePurchaseEntity.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .tier(tier)
                .amountPaid(item.getPrice())
                .purchasedAt(purchasedAt)
                .build());
        return account(userId);
    }

}
