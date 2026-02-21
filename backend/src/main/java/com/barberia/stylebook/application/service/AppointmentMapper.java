package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.web.dto.AppointmentResponse;

public final class AppointmentMapper {

    private AppointmentMapper() {
    }

    public static AppointmentResponse toResponse(Appointment appointment) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getClient().getId(),
                appointment.getClient().getName(),
                appointment.getClient().getPhone(),
                appointment.getService().getId(),
                appointment.getService().getName(),
                appointment.getService().getPrice(),
                appointment.getAppointmentAt(),
                appointment.getStatus(),
                appointment.getNotes()
        );
    }
}
