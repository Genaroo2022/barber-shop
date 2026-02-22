package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class BookingRateLimiterTest {

    @Test
    void checkAllowed_blocksWhenMinuteLimitExceeded() {
        BookingRateLimiter limiter = new BookingRateLimiter(2, 100);
        String ip = "127.0.0.1";

        limiter.recordAttempt(ip);
        limiter.recordAttempt(ip);

        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed(ip));
    }

    @Test
    void checkAllowed_blocksWhenHourLimitExceeded() {
        BookingRateLimiter limiter = new BookingRateLimiter(100, 2);
        String ip = "127.0.0.1";

        limiter.recordAttempt(ip);
        limiter.recordAttempt(ip);

        assertThrows(TooManyRequestsException.class, () -> limiter.checkAllowed(ip));
    }

    @Test
    void checkAllowed_allowsWhenBelowLimits() {
        BookingRateLimiter limiter = new BookingRateLimiter(3, 10);
        String ip = "127.0.0.1";

        limiter.recordAttempt(ip);
        limiter.recordAttempt(ip);

        assertDoesNotThrow(() -> limiter.checkAllowed(ip));
    }
}
