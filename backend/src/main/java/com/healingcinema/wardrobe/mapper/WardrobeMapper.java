package com.healingcinema.wardrobe.mapper;

import java.util.List;

import com.healingcinema.auth.entity.UserEntity;
import com.healingcinema.wardrobe.WardrobeDtos.Account;
import com.healingcinema.wardrobe.WardrobeDtos.CatalogItem;
import com.healingcinema.wardrobe.entity.WardrobeCatalogItemEntity;

/** Mapper dữ liệu danh mục và tài khoản tủ đồ. */
public final class WardrobeMapper {
    private WardrobeMapper() {}

    public static CatalogItem toCatalogItem(WardrobeCatalogItemEntity item, boolean owned, Long purchasedAt) {
        return new CatalogItem(item.getTier(), item.getName(), item.getPrice(), item.getFrameDescription(),
                item.getShirtDescription(), item.getAccentColor(), item.getSoftColor(), item.getGlowColor(),
                item.getShirtColor(), item.getSleeveColor(), item.getNameColor(), item.getOrnamentColor(),
                item.getFrameLight(), item.getFrameMid(), item.getFrameDark(), item.getFrameBgTop(),
                item.getFrameBgBottom(), item.getFrameText(), item.getGemLight(), item.getGemMid(),
                item.getGemDark(), owned, purchasedAt);
    }

    public static Account toAccount(UserEntity user, int ownedThroughTier, List<CatalogItem> items) {
        return new Account(user.getDisplayName(), user.getDonationTotalConfirmed(),
                user.getDonationUsableBalance(), ownedThroughTier, items);
    }
}
