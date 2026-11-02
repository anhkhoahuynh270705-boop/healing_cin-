CREATE TABLE IF NOT EXISTS cinema_users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(24) NOT NULL UNIQUE,
    password_salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(64) NOT NULL,
    display_name VARCHAR(40) NOT NULL,
    avatar VARCHAR(32) NOT NULL,
    shirt_color_index INTEGER NOT NULL,
    accessory_index INTEGER NOT NULL,
    hair_color_index INTEGER NOT NULL,
    vip_tier INTEGER NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    username VARCHAR(24) NOT NULL,
    tier INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    memo VARCHAR(200) NOT NULL,
    status VARCHAR(16) NOT NULL,
    created_at BIGINT NOT NULL,
    request_type VARCHAR(20) NOT NULL,
    room_code VARCHAR(48),
    room_name VARCHAR(40),
    room_lofi_index INTEGER NOT NULL DEFAULT 0
);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'type')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_requests' AND column_name = 'request_type') THEN
        ALTER TABLE payment_requests RENAME COLUMN type TO request_type;
    END IF;
END $$;
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS room_lofi_index INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_payment_user_status ON payment_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_status_created ON payment_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_room_code ON payment_requests(room_code);

CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    expires_at BIGINT NOT NULL,
    revoked_at BIGINT
);

CREATE TABLE IF NOT EXISTS cinema_rooms (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    playback_video_id VARCHAR(32) NOT NULL,
    playback_title VARCHAR(200) NOT NULL,
    playback_source VARCHAR(16) NOT NULL,
    playback_position DOUBLE PRECISION NOT NULL,
    playback_playing BOOLEAN NOT NULL,
    playback_updated_at BIGINT NOT NULL,
    lofi_index INTEGER NOT NULL,
    host_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS room_guests (
    id VARCHAR(100) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL,
    client_id VARCHAR(64),
    user_id VARCHAR(36),
    name VARCHAR(24) NOT NULL,
    avatar VARCHAR(32) NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    face INTEGER NOT NULL,
    seat INTEGER,
    shirt_color_index INTEGER NOT NULL,
    accessory_index INTEGER NOT NULL,
    hair_color_index INTEGER NOT NULL,
    vip_tier INTEGER NOT NULL,
    last_move_at BIGINT NOT NULL,
    joined_at BIGINT NOT NULL,
    CONSTRAINT uq_room_guest_seat UNIQUE (room_id, seat)
);
CREATE INDEX IF NOT EXISTS idx_room_guests_room ON room_guests(room_id);

CREATE TABLE IF NOT EXISTS room_queue_videos (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL,
    video_id VARCHAR(11) NOT NULL,
    title VARCHAR(200) NOT NULL,
    requested_by VARCHAR(24) NOT NULL,
    queued_at BIGINT NOT NULL,
    CONSTRAINT uq_room_queue_video UNIQUE (room_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_room_queue_order ON room_queue_videos(room_id, queued_at);

CREATE TABLE IF NOT EXISTS room_skip_votes (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    CONSTRAINT uq_room_skip_voter UNIQUE (room_id, session_id)
);

CREATE TABLE IF NOT EXISTS room_chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    sender_name VARCHAR(24) NOT NULL,
    sender_avatar VARCHAR(32) NOT NULL,
    message_text VARCHAR(400) NOT NULL,
    message_time BIGINT NOT NULL,
    vip_tier INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_room_chat_history ON room_chat_messages(room_id, message_time);

-- Khách đang trực tuyến và phiếu skip là trạng thái gắn với WebSocket đang mở.
-- Xóa phiên mồ côi sau khi server khởi động lại; queue/video/chat/playback vẫn giữ lại.
DELETE FROM room_skip_votes;
DELETE FROM room_guests;
UPDATE cinema_rooms SET host_id = NULL;
