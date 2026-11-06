WITH approved_donations AS (
    SELECT user_id, SUM(amount)::BIGINT AS total
    FROM payment_requests
    WHERE request_type = 'DONATION' AND status = 'APPROVED'
    GROUP BY user_id
), confirmed_totals AS (
    SELECT u.id, GREATEST(u.donation_total_confirmed, COALESCE(d.total, 0)) AS total
    FROM cinema_users u
    LEFT JOIN approved_donations d ON d.user_id = u.id
)
UPDATE cinema_users u
SET donation_total_confirmed = c.total,
    vip_tier = GREATEST(u.vip_tier, CASE
        WHEN c.total >= 10000000 THEN 10
        WHEN c.total >= 5000000 THEN 9
        WHEN c.total >= 2000000 THEN 8
        WHEN c.total >= 1000000 THEN 7
        WHEN c.total >= 500000 THEN 6
        WHEN c.total >= 200000 THEN 5
        WHEN c.total >= 100000 THEN 4
        WHEN c.total >= 50000 THEN 3
        WHEN c.total >= 20000 THEN 2
        WHEN c.total >= 10000 THEN 1
        ELSE 0
    END)
FROM confirmed_totals c
WHERE c.id = u.id AND c.total > 0;
