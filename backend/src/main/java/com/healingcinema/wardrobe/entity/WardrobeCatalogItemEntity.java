package com.healingcinema.wardrobe.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "wardrobe_catalog_items")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class WardrobeCatalogItemEntity {
    @Id private Integer tier;
    @Column(nullable = false, length = 32) private String name;
    @Column(nullable = false) private long price;
    @Column(name = "frame_description", nullable = false, length = 240) private String frameDescription;
    @Column(name = "shirt_description", nullable = false, length = 240) private String shirtDescription;
    @Column(name = "accent_color", nullable = false, length = 32) private String accentColor;
    @Column(name = "soft_color", nullable = false, length = 48) private String softColor;
    @Column(name = "glow_color", nullable = false, length = 48) private String glowColor;
    @Column(name = "shirt_color", nullable = false, length = 32) private String shirtColor;
    @Column(name = "sleeve_color", nullable = false, length = 32) private String sleeveColor;
    @Column(name = "name_color", nullable = false, length = 32) private String nameColor;
    @Column(name = "ornament_color", nullable = false, length = 32) private String ornamentColor;
    @Column(name = "frame_light", nullable = false, length = 32) private String frameLight;
    @Column(name = "frame_mid", nullable = false, length = 32) private String frameMid;
    @Column(name = "frame_dark", nullable = false, length = 32) private String frameDark;
    @Column(name = "frame_bg_top", nullable = false, length = 32) private String frameBgTop;
    @Column(name = "frame_bg_bottom", nullable = false, length = 32) private String frameBgBottom;
    @Column(name = "frame_text", nullable = false, length = 32) private String frameText;
    @Column(name = "gem_light", nullable = false, length = 32) private String gemLight;
    @Column(name = "gem_mid", nullable = false, length = 32) private String gemMid;
    @Column(name = "gem_dark", nullable = false, length = 32) private String gemDark;
}
