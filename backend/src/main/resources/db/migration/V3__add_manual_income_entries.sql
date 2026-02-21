CREATE TABLE IF NOT EXISTS manual_income_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(12,2) NOT NULL,
    tip_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    occurred_on DATE NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_income_entries_occurred_on
ON manual_income_entries(occurred_on DESC, created_at DESC);
