package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HaircutAiRateLimiterTest {

    @Test
    void shouldBlockWhenMinuteLimitExceeded() {
        HaircutAiRateLimiter limiter = new HaircutAiRateLimiter(2, 100);

        limiter.checkAllowed("10.0.0.1");
        limiter.recordAttempt("10.0.0.1");
        limiter.checkAllowed("10.0.0.1");
        limiter.recordAttempt("10.0.0.1");

        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed("10.0.0.1"));
    }

    @Test
    void shouldBlockWhenHourLimitExceeded() {
        HaircutAiRateLimiter limiter = new HaircutAiRateLimiter(100, 2);

        limiter.checkAllowed("10.0.0.2");
        limiter.recordAttempt("10.0.0.2");
        limiter.checkAllowed("10.0.0.2");
        limiter.recordAttempt("10.0.0.2");

        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed("10.0.0.2"));
    }

    @Test
    void shouldAllowDifferentIps() {
        HaircutAiRateLimiter limiter = new HaircutAiRateLimiter(1, 1);

        limiter.checkAllowed("10.0.0.3");
        limiter.recordAttempt("10.0.0.3");

        assertDoesNotThrow(() -> limiter.checkAllowed("10.0.0.4"));
    }
}
