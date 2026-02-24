package com.barberia.stylebook.web.dto;

import com.barberia.stylebook.domain.enums.AppointmentStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PublicAppointmentResponse(
        UUID id,
        UUID serviceId,
        String serviceName,
        OffsetDateTime appointmentAt,
        AppointmentStatus status
) {
}
