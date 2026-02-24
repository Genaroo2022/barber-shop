package com.barberia.stylebook.config;

import jakarta.annotation.PostConstruct;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class SchemaMigrationConfig {

    private final DataSource dataSource;
    private final String[] locations;

    public SchemaMigrationConfig(
            DataSource dataSource,
            @Value("${spring.flyway.locations:classpath:db/migration}") String[] locations
    ) {
        this.dataSource = dataSource;
        this.locations = locations;
    }

    @PostConstruct
    public void migrate() {
        ensureSetUpdatedAtFunction();

        Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)
                .baselineOnMigrate(true)
                .load()
                .migrate();
    }

    private void ensureSetUpdatedAtFunction() {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("""
                CREATE OR REPLACE FUNCTION set_updated_at()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = now();
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
                """);
    }
}
