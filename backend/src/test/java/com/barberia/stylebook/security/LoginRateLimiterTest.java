package com.barberia.stylebook.security;

import com.barberia.stylebook.application.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LoginRateLimiterTest {

    private final LoginRateLimiter limiter = new LoginRateLimiter();

    @Test
    void checkAllowed_blocksImmediatelyAfterFailure() {
        limiter.recordFailure("127.0.0.1", "admin@barber.com");

        assertThrows(
                TooManyRequestsException.class,
                () -> limiter.checkAllowed("127.0.0.1", "admin@barber.com")
        );
    }

    @Test
    void recordSuccess_clearsBlockForIpAndEmail() {
        limiter.recordFailure("127.0.0.1", "admin@barber.com");
        limiter.recordSuccess("127.0.0.1", "admin@barber.com");

        assertDoesNotThrow(() -> limiter.checkAllowed("127.0.0.1", "admin@barber.com"));
    }
}
