ALTER TABLE user_task_claims
    ADD COLUMN IF NOT EXISTS claim_date DATE;

-- Gán các lượt nhận cũ theo ngày Việt Nam; giữ nguyên ngày đã có.
UPDATE user_task_claims
SET claim_date = (to_timestamp(claimed_at / 1000.0) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
WHERE claim_date IS NULL;

ALTER TABLE user_task_claims
    ALTER COLUMN claim_date SET NOT NULL;

-- Bỏ ràng buộc cũ chỉ cho nhận nhiệm vụ một lần trong cả đời tài khoản.
ALTER TABLE user_task_claims
    DROP CONSTRAINT IF EXISTS uq_user_task_claim;

-- Tránh tạo trùng nếu DB đã có ràng buộc theo ngày.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'user_task_claims'::regclass
          AND conname = 'uq_user_task_claim_day'
    ) THEN
        ALTER TABLE user_task_claims
            ADD CONSTRAINT uq_user_task_claim_day UNIQUE (user_id, task_id, claim_date);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_task_claims_user_day
    ON user_task_claims (user_id, claim_date);
