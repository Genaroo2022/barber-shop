package com.barberia.stylebook.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.concurrent.Semaphore;

@Component
public class HaircutAiConcurrencyLimiter {
    private final Semaphore semaphore;

    public HaircutAiConcurrencyLimiter(
            @Value("${app.security.ai.max-concurrent-requests:2}") int maxConcurrentRequests
    ) {
        int permits = Math.max(1, maxConcurrentRequests);
        this.semaphore = new Semaphore(permits);
    }

    public boolean tryAcquire() {
        return semaphore.tryAcquire();
    }

    public void release() {
        semaphore.release();
    }
}
