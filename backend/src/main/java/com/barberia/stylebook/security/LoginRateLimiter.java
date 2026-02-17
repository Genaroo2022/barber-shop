package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private static final int MAX_BACKOFF_SECONDS = 300;
    private static final int MAX_EXPONENT = 8;
    private static final long STALE_ENTRY_SECONDS = 24 * 60 * 60;

    private final Map<String, AttemptState> attemptsByIp = new ConcurrentHashMap<>();
    private final Map<String, AttemptState> attemptsByEmail = new ConcurrentHashMap<>();

    public void checkAllowed(String clientIp, String email) {
        long now = Instant.now().getEpochSecond();
        checkKey(attemptsByIp, normalizeIp(clientIp), now);
        checkKey(attemptsByEmail, normalizeEmail(email), now);
    }

    public void recordFailure(String clientIp, String email) {
        long now = Instant.now().getEpochSecond();
        registerFailure(attemptsByIp, normalizeIp(clientIp), now);
        registerFailure(attemptsByEmail, normalizeEmail(email), now);
        cleanupStaleEntries(now);
    }

    public void recordSuccess(String clientIp, String email) {
        attemptsByIp.remove(normalizeIp(clientIp));
        attemptsByEmail.remove(normalizeEmail(email));
    }

    private void checkKey(Map<String, AttemptState> store, String key, long now) {
        AttemptState state = store.get(key);
        if (state == null) {
            return;
        }
        if (state.blockedUntilEpochSeconds > now) {
            throw new TooManyRequestsException("Demasiados intentos. Intenta de nuevo en unos minutos.");
        }
    }

    private void registerFailure(Map<String, AttemptState> store, String key, long now) {
        store.compute(key, (k, state) -> {
            AttemptState next = (state == null) ? new AttemptState() : state;
            next.failureCount++;
            next.lastFailureEpochSeconds = now;

            int exponent = Math.min(next.failureCount, MAX_EXPONENT);
            int backoff = Math.min(1 << exponent, MAX_BACKOFF_SECONDS);
            next.blockedUntilEpochSeconds = now + backoff;
            return next;
        });
    }

    private void cleanupStaleEntries(long now) {
        cleanup(attemptsByIp, now);
        cleanup(attemptsByEmail, now);
    }

    private void cleanup(Map<String, AttemptState> store, long now) {
        store.entrySet().removeIf(entry -> (now - entry.getValue().lastFailureEpochSeconds) > STALE_ENTRY_SECONDS);
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
