package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateAppointmentRequest(
        @NotBlank @Size(min = 2, max = 120) String clientName,
        @NotBlank
        @Size(min = 7, max = 40)
        @Pattern(regexp = "^[0-9+()\\-\\s]+$") String clientPhone,
        @NotNull UUID serviceId,
        @NotNull @Future OffsetDateTime appointmentAt,
        @Size(max = 300) String notes
) {
}
