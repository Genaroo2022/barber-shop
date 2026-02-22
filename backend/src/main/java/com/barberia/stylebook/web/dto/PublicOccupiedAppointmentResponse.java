package com.barberia.stylebook.web.dto;

import java.time.OffsetDateTime;

public record PublicOccupiedAppointmentResponse(
        OffsetDateTime appointmentAt
) {
}
