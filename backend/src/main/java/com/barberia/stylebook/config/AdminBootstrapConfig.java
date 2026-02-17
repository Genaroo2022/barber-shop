package com.barberia.stylebook.config;

import com.barberia.stylebook.domain.entity.AdminUser;
import com.barberia.stylebook.repository.AdminUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminBootstrapConfig {

    @Bean
    @ConditionalOnProperty(prefix = "app.bootstrap.admin", name = "enabled", havingValue = "true")
    CommandLineRunner adminBootstrapRunner(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin.email}") String email,
            @Value("${app.bootstrap.admin.password}") String password
    ) {
        return args -> {
            if (adminUserRepository.findByEmailIgnoreCase(email).isPresent()) {
                return;
            }
            AdminUser user = new AdminUser();
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode(password));
            user.setRole("ADMIN");
            user.setActive(true);
            adminUserRepository.save(user);
        };
    }
}
