package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.NotBlank;

public record FirebaseLoginRequest(
        @NotBlank String idToken
) {
}
