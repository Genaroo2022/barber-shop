package com.barberia.stylebook.web.dto;

import com.barberia.stylebook.domain.enums.AppointmentStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AppointmentResponse(
        UUID id,
        UUID clientId,
        String clientName,
        String clientPhone,
        UUID serviceId,
        String serviceName,
        OffsetDateTime appointmentAt,
        AppointmentStatus status,
        String notes
) {
}
