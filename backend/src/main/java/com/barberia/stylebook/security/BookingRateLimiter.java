package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;

@Component
public class BookingRateLimiter {
    private static final int MAX_IP_ENTRIES = 20_000;

    private final int maxPerMinute;
    private final int maxPerHour;
    private final Cache<String, AttemptWindow> attemptsByIp;

    public BookingRateLimiter(
            @Value("${app.security.booking.max-requests-per-minute:12}") int maxPerMinute,
            @Value("${app.security.booking.max-requests-per-hour:120}") int maxPerHour
    ) {
        this.maxPerMinute = maxPerMinute;
        this.maxPerHour = maxPerHour;
        this.attemptsByIp = Caffeine.newBuilder()
                .maximumSize(MAX_IP_ENTRIES)
                .expireAfterAccess(Duration.ofHours(2))
                .build();
    }

    public void checkAllowed(String clientIp) {
        String key = normalizeIp(clientIp);
        long now = Instant.now().getEpochSecond();
        AttemptWindow window = attemptsByIp.get(key, ignored -> new AttemptWindow());

        if (window.attemptsInLastMinute(now) >= maxPerMinute) {
            throw new TooManyRequestsException("Demasiadas reservas en poco tiempo. Intenta nuevamente en 1 minuto.");
        }

        if (window.attemptsInLastHour(now) >= maxPerHour) {
            throw new TooManyRequestsException("Demasiadas reservas desde tu IP. Intenta nuevamente mas tarde.");
        }
    }

    public void recordAttempt(String clientIp) {
        String key = normalizeIp(clientIp);
        long now = Instant.now().getEpochSecond();
        AttemptWindow window = attemptsByIp.get(key, ignored -> new AttemptWindow());
        window.record(now);
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        return ip.trim();
    }

    private static final class AttemptWindow {
        private final Deque<Long> minuteAttempts = new ArrayDeque<>();
        private final Deque<Long> hourAttempts = new ArrayDeque<>();

        synchronized long attemptsInLastMinute(long nowEpochSeconds) {
            purge(nowEpochSeconds);
            return minuteAttempts.size();
        }

        synchronized long attemptsInLastHour(long nowEpochSeconds) {
            purge(nowEpochSeconds);
            return hourAttempts.size();
        }

        synchronized void record(long nowEpochSeconds) {
            purge(nowEpochSeconds);
            minuteAttempts.addLast(nowEpochSeconds);
            hourAttempts.addLast(nowEpochSeconds);
        }

        private void purge(long nowEpochSeconds) {
            long minuteThreshold = nowEpochSeconds - 60;
            while (!minuteAttempts.isEmpty() && minuteAttempts.peekFirst() <= minuteThreshold) {
                minuteAttempts.pollFirst();
            }

            long hourThreshold = nowEpochSeconds - 3600;
            while (!hourAttempts.isEmpty() && hourAttempts.peekFirst() <= hourThreshold) {
                hourAttempts.pollFirst();
            }
        }
    }
}
