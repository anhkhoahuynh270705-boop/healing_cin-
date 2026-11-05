ALTER TABLE cinema_users
    ADD COLUMN IF NOT EXISTS donation_transfer_code VARCHAR(40),
    ADD COLUMN IF NOT EXISTS donation_total_confirmed BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS donation_usable_balance BIGINT NOT NULL DEFAULT 0;

UPDATE cinema_users
SET donation_transfer_code = 'HEALING ' || upper(substr(md5(id), 1, 12)) || ' UNG HO'
WHERE donation_transfer_code IS NULL OR donation_transfer_code = '';

ALTER TABLE cinema_users ALTER COLUMN donation_transfer_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cinema_users_donation_transfer_code
    ON cinema_users(donation_transfer_code);
