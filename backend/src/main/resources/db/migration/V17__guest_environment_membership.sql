ALTER TABLE room_guests
    ADD COLUMN environment VARCHAR(8) NOT NULL DEFAULT 'indoor';

ALTER TABLE room_guests
    DROP CONSTRAINT IF EXISTS uq_room_guest_seat;

ALTER TABLE room_guests
    ADD CONSTRAINT uq_room_guest_seat UNIQUE (room_id, environment, seat);

CREATE INDEX IF NOT EXISTS idx_room_guests_room_environment
    ON room_guests (room_id, environment);
