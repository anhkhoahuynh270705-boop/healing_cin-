CREATE TABLE IF NOT EXISTS room_queue_votes (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(80) NOT NULL,
    video_id VARCHAR(11) NOT NULL,
    voter_id VARCHAR(120) NOT NULL,
    voted_at BIGINT NOT NULL,
    CONSTRAINT uq_room_queue_vote_voter UNIQUE (room_id, video_id, voter_id),
    CONSTRAINT fk_room_queue_vote_video
        FOREIGN KEY (room_id, video_id)
        REFERENCES room_queue_videos (room_id, video_id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_room_queue_votes_video
    ON room_queue_votes (room_id, video_id);
