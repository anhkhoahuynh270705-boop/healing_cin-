UPDATE user_task_claims
SET claim_date = (to_timestamp(claimed_at / 1000.0) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
WHERE claim_date IS NULL;

ALTER TABLE user_task_claims ALTER COLUMN claim_date SET NOT NULL;

ALTER TABLE user_task_claims DROP CONSTRAINT uq_user_task_claim;
ALTER TABLE user_task_claims
    ADD CONSTRAINT uq_user_task_claim UNIQUE (user_id, task_id, claim_date);