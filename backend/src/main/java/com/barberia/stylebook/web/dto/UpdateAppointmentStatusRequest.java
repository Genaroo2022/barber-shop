package com.barberia.stylebook.web.dto;

import com.barberia.stylebook.domain.enums.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateAppointmentStatusRequest(
        @NotNull AppointmentStatus status
) {
}
