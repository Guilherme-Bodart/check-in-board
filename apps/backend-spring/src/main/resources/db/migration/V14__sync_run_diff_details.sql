ALTER TABLE sync_runs ADD COLUMN reservations_created INT NOT NULL DEFAULT 0;
ALTER TABLE sync_runs ADD COLUMN reservations_updated INT NOT NULL DEFAULT 0;
ALTER TABLE sync_runs ADD COLUMN reservations_cancelled INT NOT NULL DEFAULT 0;
ALTER TABLE sync_runs ADD COLUMN diff_details_json VARCHAR(4000);
