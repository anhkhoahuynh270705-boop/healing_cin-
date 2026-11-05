CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_donation_per_user
    ON payment_requests(user_id)
    WHERE request_type = 'DONATION' AND status = 'PENDING';
