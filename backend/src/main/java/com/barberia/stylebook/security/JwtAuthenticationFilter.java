package com.barberia.stylebook.security;

import com.barberia.stylebook.domain.entity.AdminUser;
import com.barberia.stylebook.repository.AdminUserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";
    private final JwtService jwtService;
    private final AdminUserRepository adminUserRepository;
    private final AdminAuthorizationCache adminAuthorizationCache;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            AdminUserRepository adminUserRepository,
            AdminAuthorizationCache adminAuthorizationCache
    ) {
        this.jwtService = jwtService;
        this.adminUserRepository = adminUserRepository;
        this.adminAuthorizationCache = adminAuthorizationCache;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(PREFIX)) {
            String token = header.substring(PREFIX.length());
            if (jwtService.isValid(token)) {
                boolean isAdminRole = jwtService.extractStringClaim(token, "role")
                        .map(role -> "ADMIN".equalsIgnoreCase(role))
                        .orElse(false);
                if (isAdminRole) {
                    boolean isFirebaseToken = jwtService.extractStringClaim(token, "firebaseUid").isPresent();
                    jwtService.extractSubject(token).ifPresent(subject -> {
                        if (isFirebaseToken) {
                            setAdminAuthentication(subject);
                            return;
                        }

                        boolean allowed = adminAuthorizationCache.isAllowed(
                                subject,
                                () -> adminUserRepository.findByEmailIgnoreCase(subject)
                                        .filter(user -> Boolean.TRUE.equals(user.getActive()))
                                        .map(AdminUser::getRole)
                                        .filter(role -> "ADMIN".equalsIgnoreCase(role))
                                        .isPresent()
                        );
                        if (allowed) {
                            setAdminAuthentication(subject);
                        }
                    });
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private void setAdminAuthentication(String principal) {
        var auth = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
