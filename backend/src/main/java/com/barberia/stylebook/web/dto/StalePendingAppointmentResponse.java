package com.barberia.stylebook.web.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StalePendingAppointmentResponse(
        UUID id,
        String clientName,
        String clientPhone,
        String serviceName,
        OffsetDateTime appointmentAt,
        OffsetDateTime createdAt,
        long minutesPending
) {
}
