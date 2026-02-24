package com.barberia.stylebook.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver(
            List.of("127.0.0.1/32", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")
    );

    @Test
    void resolve_usesRemoteAddrWhenCallerIsNotTrustedProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("198.51.100.10");
        request.addHeader("X-Forwarded-For", "203.0.113.20");

        String resolved = resolver.resolve(request);

        assertEquals("198.51.100.10", resolved);
    }

    @Test
    void resolve_usesLastUntrustedHopToPreventLeftMostSpoofing() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "8.8.8.8, 198.51.100.25");

        String resolved = resolver.resolve(request);

        assertEquals("198.51.100.25", resolved);
    }

    @Test
    void resolve_skipsInvalidForwardedEntries() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "garbage, 198.51.100.30");

        String resolved = resolver.resolve(request);

        assertEquals("198.51.100.30", resolved);
    }
}
