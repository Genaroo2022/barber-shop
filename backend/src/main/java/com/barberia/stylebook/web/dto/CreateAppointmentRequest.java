package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CreateAppointmentRequest(
        @NotBlank String clientName,
        @NotBlank String clientPhone,
        @NotNull UUID serviceId,
        @NotNull @Future OffsetDateTime appointmentAt,
        String notes
) {
}
