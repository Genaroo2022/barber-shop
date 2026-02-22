package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class BookingRateLimiter {

    private final int maxPerMinute;
    private final int maxPerHour;
    private final Map<String, Deque<Long>> attemptsByIp = new ConcurrentHashMap<>();

    public BookingRateLimiter(
            @Value("${app.security.booking.max-requests-per-minute:12}") int maxPerMinute,
            @Value("${app.security.booking.max-requests-per-hour:120}") int maxPerHour
    ) {
        this.maxPerMinute = maxPerMinute;
        this.maxPerHour = maxPerHour;
    }

    public void checkAllowed(String clientIp) {
        String key = normalizeIp(clientIp);
        long now = Instant.now().getEpochSecond();
        Deque<Long> attempts = attemptsByIp.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        purgeOld(attempts, now);

        long attemptsInLastMinute = attempts.stream().filter(ts -> ts > now - 60).count();
        if (attemptsInLastMinute >= maxPerMinute) {
            throw new TooManyRequestsException("Demasiadas reservas en poco tiempo. Intenta nuevamente en 1 minuto.");
        }

        if (attempts.size() >= maxPerHour) {
            throw new TooManyRequestsException("Demasiadas reservas desde tu IP. Intenta nuevamente mas tarde.");
        }
    }

    public void recordAttempt(String clientIp) {
        String key = normalizeIp(clientIp);
        long now = Instant.now().getEpochSecond();
        Deque<Long> attempts = attemptsByIp.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        attempts.addLast(now);
        purgeOld(attempts, now);
    }

    private void purgeOld(Deque<Long> attempts, long now) {
        long threshold = now - 3600;
        while (true) {
            Long head = attempts.peekFirst();
            if (head == null || head >= threshold) {
                return;
            }
            attempts.pollFirst();
        }
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return "unknown";
        }
        return ip.trim();
    }
}
