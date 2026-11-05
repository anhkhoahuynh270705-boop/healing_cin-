ALTER TABLE cinema_rooms
    ADD COLUMN playback_duration_seconds INTEGER NOT NULL DEFAULT 0;

CREATE TABLE personal_media_uploads (
    id VARCHAR(32) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL REFERENCES cinema_rooms(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL,
    uploaded_by VARCHAR(36) NOT NULL REFERENCES cinema_users(id) ON DELETE CASCADE,
    original_name VARCHAR(160) NOT NULL,
    content_type VARCHAR(80) NOT NULL,
    storage_name VARCHAR(48) NOT NULL UNIQUE,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds BETWEEN 1 AND 10),
    charged_amount BIGINT NOT NULL CHECK (charged_amount BETWEEN 5000 AND 50000),
    uploaded_at BIGINT NOT NULL
);

CREATE INDEX idx_personal_media_room
    ON personal_media_uploads (room_id, uploaded_at);
