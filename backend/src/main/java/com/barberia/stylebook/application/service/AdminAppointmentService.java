package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.entity.Client;
import com.barberia.stylebook.domain.entity.ServiceCatalog;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ClientRepository;
import com.barberia.stylebook.repository.ServiceCatalogRepository;
import com.barberia.stylebook.web.dto.AdminAppointmentUpsertRequest;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AdminAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ServiceCatalogRepository serviceCatalogRepository;
    private final ClientRepository clientRepository;

    public AdminAppointmentService(
            AppointmentRepository appointmentRepository,
            ServiceCatalogRepository serviceCatalogRepository,
            ClientRepository clientRepository
    ) {
        this.appointmentRepository = appointmentRepository;
        this.serviceCatalogRepository = serviceCatalogRepository;
        this.clientRepository = clientRepository;
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

    @Transactional
    public AppointmentResponse update(UUID appointmentId, AdminAppointmentUpsertRequest request) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Turno no encontrado"));

        if (appointment.getStatus() == AppointmentStatus.COMPLETED || appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new BusinessRuleException("No se puede editar un turno completado o cancelado");
        }

        String normalizedClientName = request.clientName().trim();
        String normalizedClientPhone = request.clientPhone().trim();
        String normalizedNotes = request.notes() == null ? null : request.notes().trim();
        if (normalizedNotes != null && normalizedNotes.isEmpty()) {
            normalizedNotes = null;
        }

        ServiceCatalog service = serviceCatalogRepository.findById(request.serviceId())
                .orElseThrow(() -> new NotFoundException("Servicio no encontrado"));
        if (!Boolean.TRUE.equals(service.getActive())) {
            throw new BusinessRuleException("El servicio seleccionado no esta activo");
        }

        OffsetDateTime appointmentAt = request.appointmentAt().withSecond(0).withNano(0);
        if (appointmentRepository.existsByServiceIdAndAppointmentAtAndIdNot(service.getId(), appointmentAt, appointmentId)) {
            throw new BusinessRuleException("Ya existe un turno para ese servicio en esa fecha/hora");
        }

        Client client = clientRepository.findByPhone(normalizedClientPhone)
                .map(existing -> {
                    existing.setName(normalizedClientName);
                    return existing;
                })
                .orElseGet(() -> {
                    Client created = new Client();
                    created.setName(normalizedClientName);
                    created.setPhone(normalizedClientPhone);
                    return created;
                });

        Client persistedClient = clientRepository.save(client);
        appointment.setClient(persistedClient);
        appointment.setService(service);
        appointment.setAppointmentAt(appointmentAt);
        appointment.setNotes(normalizedNotes);

        return AppointmentMapper.toResponse(appointmentRepository.save(appointment));
    }

    @Transactional
    public void delete(UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException("Turno no encontrado"));
        appointmentRepository.delete(appointment);
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
