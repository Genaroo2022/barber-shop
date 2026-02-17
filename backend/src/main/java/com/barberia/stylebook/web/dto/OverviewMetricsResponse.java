package com.barberia.stylebook.web.dto;

public record OverviewMetricsResponse(
        long totalAppointments,
        long pendingAppointments,
        long completedAppointments,
        long uniqueClients,
        String popularService
) {
}
