DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
        WHERE n.nspname = 'public'
          AND t.relname = 'admin_users'
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND a.attname = 'email'
    LOOP
        EXECUTE format('ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.admin_users
ALTER COLUMN email DROP NOT NULL;

UPDATE public.admin_users
SET email = NULL
WHERE email IS NOT NULL
  AND lower(trim(email)) ~ '(^admin@barberia\.com$|@example\.com$|@test\.com$|fake|random|dummy|noreply)';

DROP INDEX IF EXISTS public.ux_admin_users_email_not_null;
CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_users_email_not_null
ON public.admin_users (lower(email))
WHERE email IS NOT NULL;
