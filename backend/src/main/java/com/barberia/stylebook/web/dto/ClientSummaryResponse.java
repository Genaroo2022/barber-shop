package com.barberia.stylebook.web.dto;

public record ClientSummaryResponse(
        String clientName,
        String clientPhone,
        long totalAppointments,
        String lastVisit
) {
}
