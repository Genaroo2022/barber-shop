package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

@Component
public class LoginRateLimiter {

    private static final int MAX_BACKOFF_SECONDS = 300;
    private static final int MAX_EXPONENT = 8;
    private static final int MAX_ENTRIES_PER_STORE = 20_000;

    private final Cache<String, AttemptState> attemptsByIp = Caffeine.newBuilder()
            .maximumSize(MAX_ENTRIES_PER_STORE)
            .expireAfterAccess(Duration.ofHours(24))
            .build();
    private final Cache<String, AttemptState> attemptsByEmail = Caffeine.newBuilder()
            .maximumSize(MAX_ENTRIES_PER_STORE)
            .expireAfterAccess(Duration.ofHours(24))
            .build();

    public void checkAllowed(String clientIp, String email) {
        long now = Instant.now().getEpochSecond();
        checkKey(attemptsByIp, normalizeIp(clientIp), now);
        checkKey(attemptsByEmail, normalizeEmail(email), now);
    }

    public void recordFailure(String clientIp, String email) {
        long now = Instant.now().getEpochSecond();
        registerFailure(attemptsByIp, normalizeIp(clientIp), now);
        registerFailure(attemptsByEmail, normalizeEmail(email), now);
    }

    public void recordSuccess(String clientIp, String email) {
        attemptsByIp.invalidate(normalizeIp(clientIp));
        attemptsByEmail.invalidate(normalizeEmail(email));
    }

    private void checkKey(Cache<String, AttemptState> store, String key, long now) {
        AttemptState state = store.getIfPresent(key);
        if (state == null) {
            return;
        }
        if (state.blockedUntilEpochSeconds > now) {
            throw new TooManyRequestsException("Demasiados intentos. Intenta de nuevo en unos minutos.");
        }
    }

    private void registerFailure(Cache<String, AttemptState> store, String key, long now) {
        store.asMap().compute(key, (ignored, existing) -> {
            AttemptState next = (existing == null) ? new AttemptState() : existing;
            next.failureCount++;
            next.lastFailureEpochSeconds = now;

            int exponent = Math.min(next.failureCount, MAX_EXPONENT);
            int backoff = Math.min(1 << exponent, MAX_BACKOFF_SECONDS);
            next.blockedUntilEpochSeconds = now + backoff;
            return next;
        });
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        return ip.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return "unknown";
        }
        return email.trim().toLowerCase();
    }

    private static class AttemptState {
        private int failureCount;
        private long blockedUntilEpochSeconds;
        private long lastFailureEpochSeconds;
    }
}
