package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.domain.entity.AdminUser;
import com.barberia.stylebook.repository.AdminUserRepository;
import com.barberia.stylebook.security.JwtService;
import com.barberia.stylebook.security.LoginRateLimiter;
import com.barberia.stylebook.web.dto.LoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
public class AuthService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;

    public AuthService(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            LoginRateLimiter loginRateLimiter
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String email, String rawPassword, String clientIp) {
        String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
        loginRateLimiter.checkAllowed(clientIp, normalizedEmail);

        AdminUser user = adminUserRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElse(null);

        if (user == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash()) || !Boolean.TRUE.equals(user.getActive())) {
            loginRateLimiter.recordFailure(clientIp, normalizedEmail);
            throw new BusinessRuleException("Credenciales invalidas");
        }

        loginRateLimiter.recordSuccess(clientIp, normalizedEmail);

        long expiresIn = jwtService.getExpirationSeconds();
        String token = jwtService.generateToken(user.getEmail(), Map.of("role", user.getRole()));
        return new LoginResponse(token, "Bearer", expiresIn);
    }
}
