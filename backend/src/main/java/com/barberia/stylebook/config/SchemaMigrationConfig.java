package com.barberia.stylebook.config;

import jakarta.annotation.PostConstruct;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

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
        Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)
                .baselineOnMigrate(true)
                .load()
                .migrate();
    }
}
