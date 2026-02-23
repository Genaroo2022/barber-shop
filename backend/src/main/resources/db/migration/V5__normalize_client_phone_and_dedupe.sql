ALTER TABLE clients
ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(20);

UPDATE clients
SET phone_normalized = regexp_replace(phone, '\D', '', 'g')
WHERE phone_normalized IS NULL OR phone_normalized = '';

WITH ranked AS (
    SELECT
        id,
        phone_normalized,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY phone_normalized ORDER BY created_at ASC, id ASC) AS rn,
        FIRST_VALUE(id) OVER (PARTITION BY phone_normalized ORDER BY created_at ASC, id ASC) AS survivor_id
    FROM clients
    WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
),
duplicates AS (
    SELECT id, survivor_id
    FROM ranked
    WHERE rn > 1
)
UPDATE appointments a
SET client_id = d.survivor_id
FROM duplicates d
WHERE a.client_id = d.id;

WITH ranked AS (
    SELECT
        id,
        phone_normalized,
        ROW_NUMBER() OVER (PARTITION BY phone_normalized ORDER BY created_at ASC, id ASC) AS rn
    FROM clients
    WHERE phone_normalized IS NOT NULL AND phone_normalized <> ''
)
DELETE FROM clients c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

ALTER TABLE clients
ALTER COLUMN phone_normalized SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_clients_phone_normalized
ON clients(phone_normalized);
