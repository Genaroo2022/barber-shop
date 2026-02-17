package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AdminAppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AdminAppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAll() {
        return appointmentRepository.findAllByOrderByAppointmentAtAsc().stream()
                .map(AppointmentMapper::toResponse)
                .toList();
    }

    @Transactional
    public AppointmentResponse updateStatus(UUID appointmentId, AppointmentStatus targetStatus) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Turno no encontrado"));

        validateTransition(appointment.getStatus(), targetStatus);
        appointment.setStatus(targetStatus);
        return AppointmentMapper.toResponse(appointmentRepository.save(appointment));
    }

    private void validateTransition(AppointmentStatus current, AppointmentStatus target) {
        if (current == target) {
            return;
        }
        if (current == AppointmentStatus.PENDING &&
                (target == AppointmentStatus.CONFIRMED || target == AppointmentStatus.CANCELLED)) {
            return;
        }
        if (current == AppointmentStatus.CONFIRMED &&
                (target == AppointmentStatus.COMPLETED || target == AppointmentStatus.CANCELLED)) {
            return;
        }
        throw new BusinessRuleException("Transicion de estado invalida: " + current + " -> " + target);
    }
}
