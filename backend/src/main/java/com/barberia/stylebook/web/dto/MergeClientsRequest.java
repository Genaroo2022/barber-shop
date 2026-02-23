package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MergeClientsRequest(
        @NotNull UUID sourceClientId,
        @NotNull UUID targetClientId
) {
}
