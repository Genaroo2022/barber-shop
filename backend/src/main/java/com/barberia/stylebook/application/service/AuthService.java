package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.domain.entity.AdminUser;
import com.barberia.stylebook.repository.AdminUserRepository;
import com.barberia.stylebook.security.JwtService;
import com.barberia.stylebook.security.LoginRateLimiter;
import com.barberia.stylebook.web.dto.LoginResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Map;

@Service
public class AuthService {
    private static final String FIREBASE_PREAUTH_LIMITER_KEY = "firebase:preauth";

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;
    private final FirebaseIdentityService firebaseIdentityService;

    public AuthService(
            AdminUserRepository adminUserRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            LoginRateLimiter loginRateLimiter,
            FirebaseIdentityService firebaseIdentityService
    ) {
        this.adminUserRepository = adminUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
        this.firebaseIdentityService = firebaseIdentityService;
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

    @Transactional
    public LoginResponse loginWithFirebase(String idToken, String clientIp) {
        loginRateLimiter.checkAllowed(clientIp, FIREBASE_PREAUTH_LIMITER_KEY);

        FirebaseIdentityService.FirebaseIdentity identity;
        try {
            identity = firebaseIdentityService.lookupByIdToken(idToken);
        } catch (RuntimeException ex) {
            loginRateLimiter.recordFailure(clientIp, FIREBASE_PREAUTH_LIMITER_KEY);
            throw ex;
        }

        String limiterKey = "uid:" + identity.uid();
        loginRateLimiter.checkAllowed(clientIp, limiterKey);

        AdminUser user = adminUserRepository.findByFirebaseUid(identity.uid())
                .filter(found -> Boolean.TRUE.equals(found.getActive()))
                .filter(found -> "ADMIN".equalsIgnoreCase(found.getRole()))
                .orElse(null);

        if (user == null) {
            loginRateLimiter.recordFailure(clientIp, limiterKey);
            throw new BusinessRuleException("Usuario no encontrado. UID: " + identity.uid());
        }

        String providerEmail = normalizeProviderEmail(identity.email());
        if (providerEmail != null && !providerEmail.equalsIgnoreCase(user.getEmail())) {
            try {
                user.setEmail(providerEmail);
                adminUserRepository.save(user);
            } catch (DataIntegrityViolationException ex) {
                loginRateLimiter.recordFailure(clientIp, limiterKey);
                throw new BusinessRuleException("No se pudo sincronizar el email del proveedor");
            }
        }

        loginRateLimiter.recordSuccess(clientIp, limiterKey);
        loginRateLimiter.recordSuccess(clientIp, FIREBASE_PREAUTH_LIMITER_KEY);

        long expiresIn = jwtService.getExpirationSeconds();
        String token = jwtService.generateToken(identity.uid(), Map.of("role", "ADMIN", "firebaseUid", identity.uid()));
        return new LoginResponse(token, "Bearer", expiresIn);
    }

    private String normalizeProviderEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        return email.trim().toLowerCase();
    }
}
