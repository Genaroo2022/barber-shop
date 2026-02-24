CREATE INDEX IF NOT EXISTS idx_appointments_status_created_at
ON appointments(status, created_at);

CREATE INDEX IF NOT EXISTS idx_appointments_created_at
ON appointments(created_at);
