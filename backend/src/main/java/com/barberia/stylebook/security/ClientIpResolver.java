package com.barberia.stylebook.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;

@Component
public class ClientIpResolver {

    private final List<CidrBlock> trustedProxyCidrs;

    public ClientIpResolver(
            @Value("${app.security.trusted-proxy-cidrs:127.0.0.1/32,::1/128}") List<String> trustedProxyCidrs
    ) {
        this.trustedProxyCidrs = trustedProxyCidrs.stream()
                .map(CidrBlock::parse)
                .toList();
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = sanitizeIp(request.getRemoteAddr());
        if (remoteAddr == null) {
            return "unknown";
        }

        if (!isTrustedProxy(remoteAddr)) {
            return remoteAddr;
        }

        List<String> hops = extractForwardedChain(request);
        if (hops.isEmpty()) {
            return remoteAddr;
        }
        hops.add(remoteAddr);

        // Walk right-to-left and skip trusted proxy hops. First untrusted hop is treated as client IP.
        for (int i = hops.size() - 1; i >= 0; i--) {
            String hop = hops.get(i);
            if (!isTrustedProxy(hop)) {
                return hop;
            }
        }

        return remoteAddr;
    }

    private List<String> extractForwardedChain(HttpServletRequest request) {
        List<String> hops = new ArrayList<>();
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            for (String part : xForwardedFor.split(",")) {
                String candidate = sanitizeIp(part);
                if (candidate != null) {
                    hops.add(candidate);
                }
            }
        }
        return hops;
    }

    private boolean isTrustedProxy(String ip) {
        for (CidrBlock cidr : trustedProxyCidrs) {
            if (cidr.contains(ip)) {
                return true;
            }
        }
        return false;
    }

    private String sanitizeIp(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String candidate = raw.trim();
        int zoneIdx = candidate.indexOf('%');
        if (zoneIdx > 0) {
            candidate = candidate.substring(0, zoneIdx);
        }
        try {
            return InetAddress.getByName(candidate).getHostAddress();
        } catch (Exception ex) {
            return null;
        }
    }

    private static class CidrBlock {
        private final BigInteger networkValue;
        private final int prefixLength;
        private final int bitLength;

        private CidrBlock(BigInteger networkValue, int prefixLength, int bitLength) {
            this.networkValue = networkValue;
            this.prefixLength = prefixLength;
            this.bitLength = bitLength;
        }

        static CidrBlock parse(String cidr) {
            String[] parts = cidr.trim().split("/");
            if (parts.length != 2) {
                throw new IllegalArgumentException("Invalid CIDR: " + cidr);
            }
            try {
                InetAddress address = InetAddress.getByName(parts[0].trim());
                int prefix = Integer.parseInt(parts[1].trim());
                int bits = address.getAddress().length * 8;
                if (prefix < 0 || prefix > bits) {
                    throw new IllegalArgumentException("Invalid CIDR prefix: " + cidr);
                }
                BigInteger normalized = toBigInteger(address).and(mask(bits, prefix));
                return new CidrBlock(normalized, prefix, bits);
            } catch (Exception ex) {
                throw new IllegalArgumentException("Invalid CIDR: " + cidr, ex);
            }
        }

        boolean contains(String ip) {
            try {
                InetAddress address = InetAddress.getByName(ip);
                if (address.getAddress().length * 8 != bitLength) {
                    return false;
                }
                BigInteger ipValue = toBigInteger(address).and(mask(bitLength, prefixLength));
                return ipValue.equals(networkValue);
            } catch (Exception ex) {
                return false;
            }
        }

        private static BigInteger mask(int bits, int prefix) {
            if (prefix == 0) {
                return BigInteger.ZERO;
            }
            BigInteger allOnes = BigInteger.ONE.shiftLeft(bits).subtract(BigInteger.ONE);
            BigInteger hostMask = BigInteger.ONE.shiftLeft(bits - prefix).subtract(BigInteger.ONE);
            return allOnes.xor(hostMask);
        }

        private static BigInteger toBigInteger(InetAddress address) {
            return new BigInteger(1, address.getAddress());
        }
    }
}
