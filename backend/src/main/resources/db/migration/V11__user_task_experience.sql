ALTER TABLE cinema_users
    ADD COLUMN experience_points BIGINT NOT NULL DEFAULT 0;

CREATE TABLE user_task_claims (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES cinema_users(id) ON DELETE CASCADE,
    task_id VARCHAR(40) NOT NULL,
    exp_awarded INTEGER NOT NULL,
    claimed_at BIGINT NOT NULL,
    CONSTRAINT uq_user_task_claim UNIQUE (user_id, task_id)
);

CREATE INDEX idx_user_task_claims_user ON user_task_claims(user_id);
