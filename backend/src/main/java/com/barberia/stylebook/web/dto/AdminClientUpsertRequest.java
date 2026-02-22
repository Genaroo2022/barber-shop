package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminClientUpsertRequest(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotBlank
        @Size(min = 7, max = 40)
        @Pattern(regexp = "^[0-9+()\\-\\s]+$") String phone
) {
}
