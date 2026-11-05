CREATE TABLE wardrobe_catalog_items (
    tier INTEGER PRIMARY KEY,
    name VARCHAR(32) NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0),
    frame_description VARCHAR(240) NOT NULL,
    shirt_description VARCHAR(240) NOT NULL,
    accent_color VARCHAR(32) NOT NULL,
    soft_color VARCHAR(48) NOT NULL,
    glow_color VARCHAR(48) NOT NULL,
    shirt_color VARCHAR(32) NOT NULL,
    sleeve_color VARCHAR(32) NOT NULL,
    name_color VARCHAR(32) NOT NULL,
    ornament_color VARCHAR(32) NOT NULL,
    frame_light VARCHAR(32) NOT NULL,
    frame_mid VARCHAR(32) NOT NULL,
    frame_dark VARCHAR(32) NOT NULL,
    frame_bg_top VARCHAR(32) NOT NULL,
    frame_bg_bottom VARCHAR(32) NOT NULL,
    frame_text VARCHAR(32) NOT NULL,
    gem_light VARCHAR(32) NOT NULL,
    gem_mid VARCHAR(32) NOT NULL,
    gem_dark VARCHAR(32) NOT NULL
);

INSERT INTO wardrobe_catalog_items (
    tier, name, price, frame_description, shirt_description, accent_color, soft_color, glow_color,
    shirt_color, sleeve_color, name_color, ornament_color, frame_light, frame_mid, frame_dark,
    frame_bg_top, frame_bg_bottom, frame_text, gem_light, gem_mid, gem_dark
) VALUES
(0, 'Mặc định', 0, 'Nhẹ nhàng, mộc mạc.', 'Áo tím xanh dịu nhẹ, thân quen như chiếc ghế yêu thích.', '#a9b0a7', 'rgba(169,176,167,0.10)', 'transparent', '#a9b4e6', '#9ca8dc', '#2b3358', '#c5c9c0', '#c5c9c0', '#929b90', '#657065', '#20271f', '#151b16', '#f2f5ee', '#e6e9de', '#b5bdaf', '#788276'),
(1, 'VIP', 20000, 'Một chút ánh vàng ấm áp cho lời nhắn của bạn.', 'Áo màu trà ấm với đường chỉ vàng nhỏ.', '#f2c46d', 'rgba(242,196,109,0.10)', 'rgba(242,196,109,0.35)', '#77613e', '#685434', '#fff1c9', '#f2c46d', '#f6d98b', '#d9a63c', '#a8741c', '#2e1d0e', '#170f07', '#f5e1a4', '#fff3c4', '#e0ae45', '#a8741c'),
(2, 'Chiến thần', 50000, 'Sắc xanh dịu, nổi bật vừa đủ giữa cả rạp.', 'Áo xanh trời điểm viền sáng như ánh đèn rạp.', '#6cb4ff', 'rgba(108,180,255,0.10)', 'rgba(108,180,255,0.38)', '#426b91', '#385d82', '#e5f4ff', '#6cb4ff', '#b9e2ff', '#6cb4ff', '#3176b7', '#10253d', '#081522', '#d8efff', '#effaff', '#73c2ff', '#3176b7'),
(3, 'Hủy diệt', 100000, 'Tông đỏ cam rực rỡ dành cho người nhiều năng lượng.', 'Áo đỏ san hô với huy hiệu nhỏ trước ngực.', '#ff7a7a', 'rgba(255,122,122,0.11)', 'rgba(255,92,79,0.42)', '#904f4b', '#7f403d', '#ffe7df', '#ff8b67', '#ffc0a0', '#f07754', '#a94236', '#351613', '#1c0c0a', '#ffe0ce', '#fff0dc', '#ff9c6b', '#a94236'),
(4, 'Bất tử', 200000, 'Ánh tím huyền ảo, mềm mại mà khác biệt.', 'Áo tím khói có điểm nhấn ánh kim nhẹ.', '#b79cff', 'rgba(183,156,255,0.10)', 'rgba(183,156,255,0.38)', '#695d91', '#5b507f', '#f0e9ff', '#c7b4ff', '#dfd2ff', '#ad8cff', '#7256ba', '#241a3b', '#120d20', '#efe6ff', '#faf4ff', '#b99bff', '#7256ba'),
(5, 'Huyền thoại', 500000, 'Sắc bạc hà thanh mát với điểm nhấn ngọc sáng.', 'Áo xanh bạc hà thoáng mát, viền ngọc mềm.', '#5fe3c0', 'rgba(95,227,192,0.10)', 'rgba(95,227,192,0.38)', '#3f8074', '#347267', '#e2fff7', '#75f0d0', '#c4fff0', '#5fe3c0', '#239d83', '#102d29', '#081915', '#e0fff7', '#f3fffb', '#74eccd', '#239d83'),
(6, 'Hoàng đế', 1000000, 'Ánh cam vàng sang trọng cho dấu ấn khó quên.', 'Áo cam vàng quyền quý với huy hiệu ánh kim.', '#ffb347', 'rgba(255,179,71,0.10)', 'rgba(255,155,57,0.42)', '#865a35', '#754b2c', '#fff0d7', '#ffc46d', '#ffe0a0', '#ffb347', '#b96b24', '#341c10', '#1c0d08', '#ffebc3', '#fff7de', '#ffc05c', '#b96b24');

CREATE TABLE wardrobe_purchases (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES cinema_users(id) ON DELETE CASCADE,
    tier INTEGER NOT NULL REFERENCES wardrobe_catalog_items(tier),
    amount_paid BIGINT NOT NULL CHECK (amount_paid >= 0),
    purchased_at BIGINT NOT NULL,
    CONSTRAINT uq_wardrobe_purchase_user_tier UNIQUE (user_id, tier)
);
CREATE INDEX idx_wardrobe_purchases_user ON wardrobe_purchases(user_id, tier DESC);
