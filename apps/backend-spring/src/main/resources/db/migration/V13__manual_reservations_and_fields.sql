ALTER TABLE reservations ALTER COLUMN ical_source_id DROP NOT NULL;
ALTER TABLE reservations ALTER COLUMN external_event_key DROP NOT NULL;
ALTER TABLE reservations ADD COLUMN guest_count INT;
