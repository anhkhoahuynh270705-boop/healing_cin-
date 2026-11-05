package com.healingcinema.wardrobe.dto;

import java.util.List;

public final class WardrobeDtos {
    private WardrobeDtos() {}

    public record CatalogItem(int tier, String name, long price, String frameDescription, String shirtDescription,
            String accentColor, String softColor, String glowColor, String shirtColor, String sleeveColor,
            String nameColor, String ornamentColor, String frameLight, String frameMid, String frameDark,
            String frameBgTop, String frameBgBottom, String frameText, String gemLight, String gemMid,
            String gemDark, boolean owned, Long purchasedAt) {}

    public record Account(String displayName, long totalConfirmed, long usableBalance, int ownedThroughTier,
            List<CatalogItem> items) {}

    public record PurchaseRequest(String userId, String authToken, int tier) {}
}
