-- Tăng tốc truy vấn kiểm tra username không phân biệt chữ hoa/thường khi đăng ký.
CREATE INDEX IF NOT EXISTS idx_cinema_users_username_upper
    ON cinema_users (UPPER(username));
