DO $$
DECLARE
    target_table text;
BEGIN
    FOR target_table IN
        SELECT format('%I.%I', table_schema, table_name)
        FROM information_schema.columns
        WHERE column_name = 'mail'
          AND data_type IN ('character varying', 'text', 'character')
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
    LOOP
        EXECUTE format(
            'UPDATE %s
             SET mail = NULL
             WHERE mail IS NOT NULL
               AND lower(mail) ~ ''(^admin@barberia\.com$|@example\.com$|@test\.com$|fake|random|dummy|noreply)''',
            target_table
        );
    END LOOP;
END $$;
