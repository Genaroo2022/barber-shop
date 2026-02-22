package com.barberia.stylebook.web.dto;

import java.util.UUID;

public record ClientSummaryResponse(
        UUID id,
        String clientName,
        String clientPhone,
        long totalAppointments,
        String lastVisit
) {
}
