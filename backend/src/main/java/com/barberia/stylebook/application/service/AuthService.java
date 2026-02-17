package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.domain.entity.AdminUser;
import com.barberia.stylebook.repository.AdminUserRepository;
import com.barberia.stylebook.security.JwtService;
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

    public AuthService(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(String email, String rawPassword) {
        AdminUser user = adminUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BusinessRuleException("Credenciales invalidas"));

        if (!Boolean.TRUE.equals(user.getActive())) {
            throw new BusinessRuleException("Usuario deshabilitado");
        }
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw new BusinessRuleException("Credenciales invalidas");
        }

        long expiresIn = jwtService.getExpirationSeconds();
        String token = jwtService.generateToken(user.getEmail(), Map.of("role", user.getRole()));
        return new LoginResponse(token, "Bearer", expiresIn);
    }
}
