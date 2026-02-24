package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.repository.AdminUserRepository;
import com.barberia.stylebook.security.JwtService;
import com.barberia.stylebook.security.LoginRateLimiter;
import com.barberia.stylebook.web.dto.LoginResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AdminUserRepository adminUserRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private LoginRateLimiter loginRateLimiter;
    @Mock
    private FirebaseIdentityService firebaseIdentityService;

    @InjectMocks
    private AuthService authService;

    @Test
    void loginWithFirebase_shouldRateLimitBeforeExternalLookup_andRecordFailureOnInvalidToken() {
        String ip = "198.51.100.20";
        when(firebaseIdentityService.lookupByIdToken("bad-token"))
                .thenThrow(new BusinessRuleException("Credenciales invalidas"));

        assertThrows(BusinessRuleException.class, () -> authService.loginWithFirebase("bad-token", ip));

        InOrder order = inOrder(loginRateLimiter, firebaseIdentityService);
        order.verify(loginRateLimiter).checkAllowed(ip, "firebase:preauth");
        order.verify(firebaseIdentityService).lookupByIdToken("bad-token");
        order.verify(loginRateLimiter).recordFailure(ip, "firebase:preauth");
    }

    @Test
    void loginWithFirebase_shouldClearPreauthLimiterOnSuccess() {
        String ip = "198.51.100.30";
        FirebaseIdentityService.FirebaseIdentity identity =
                new FirebaseIdentityService.FirebaseIdentity("uid-1", "admin@example.com", null);
        when(firebaseIdentityService.lookupByIdToken("good-token")).thenReturn(identity);
        when(firebaseIdentityService.isUidAllowed("uid-1")).thenReturn(true);
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);
        when(jwtService.generateToken(eq("admin@example.com"), anyMap())).thenReturn("jwt-token");

        LoginResponse response = authService.loginWithFirebase("good-token", ip);

        assertEquals("jwt-token", response.accessToken());
        assertEquals(3600L, response.expiresInSeconds());
        verify(loginRateLimiter).recordSuccess(ip, "firebase:preauth");
    }
}
