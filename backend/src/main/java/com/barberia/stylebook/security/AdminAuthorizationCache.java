package com.barberia.stylebook.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Component
public class AdminAuthorizationCache {

    private final long ttlSeconds;
    private final Map<String, CachedAuthorization> cache = new ConcurrentHashMap<>();

    public AdminAuthorizationCache(
            @Value("${app.security.jwt-admin-cache-ttl-seconds:180}") long ttlSeconds
    ) {
        this.ttlSeconds = Math.max(0, ttlSeconds);
    }

    public boolean isAllowed(String subject, Supplier<Boolean> loader) {
        if (ttlSeconds == 0) {
            return loader.get();
        }

        String key = normalizeSubject(subject);
        long now = Instant.now().getEpochSecond();
        CachedAuthorization cached = cache.get(key);
        if (cached != null) {
            if (cached.expiresAtEpochSecond() > now) {
                return cached.allowed();
            }
            cache.remove(key, cached);
        }

        boolean allowed = loader.get();
        cache.put(key, new CachedAuthorization(allowed, now + ttlSeconds));
        return allowed;
    }

    private String normalizeSubject(String subject) {
        if (subject == null) {
            return "";
        }
        return subject.trim().toLowerCase();
    }

    private record CachedAuthorization(boolean allowed, long expiresAtEpochSecond) {
    }
}
