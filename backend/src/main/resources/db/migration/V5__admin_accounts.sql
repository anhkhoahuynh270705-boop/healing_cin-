CREATE TABLE IF NOT EXISTS admin_accounts (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(32) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(64) NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_accounts_username_ci
    ON admin_accounts (LOWER(username));
