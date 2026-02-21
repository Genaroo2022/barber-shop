package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.AuthService;
import com.barberia.stylebook.security.ClientIpResolver;
import com.barberia.stylebook.web.dto.LoginRequest;
import com.barberia.stylebook.web.dto.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ClientIpResolver clientIpResolver;

    public AuthController(AuthService authService, ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = clientIpResolver.resolve(httpRequest);
        return ResponseEntity.ok(authService.login(request.email(), request.password(), clientIp));
    }
}
