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
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import com.barberia.stylebook.web.dto.PublicAppointmentResponse;
import com.barberia.stylebook.web.dto.PublicOccupiedAppointmentResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.List;

@Service
public class BookingService {
    private static final EnumSet<AppointmentStatus> SLOT_OCCUPYING_STATUSES =
            EnumSet.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);

    private final ClientRepository clientRepository;
    private final ServiceCatalogRepository serviceCatalogRepository;
    private final AppointmentRepository appointmentRepository;

    public BookingService(
            ClientRepository clientRepository,
            ServiceCatalogRepository serviceCatalogRepository,
            AppointmentRepository appointmentRepository
    ) {
        this.clientRepository = clientRepository;
        this.serviceCatalogRepository = serviceCatalogRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional
    public PublicAppointmentResponse create(CreateAppointmentRequest request) {
        String normalizedClientName = request.clientName().trim();
        String normalizedClientPhone = request.clientPhone().trim();
        String phoneNormalized = PhoneNormalizer.normalize(normalizedClientPhone);
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
        if (appointmentRepository.existsByServiceIdAndAppointmentAtAndStatusIn(
                service.getId(),
                appointmentAt,
                SLOT_OCCUPYING_STATUSES
        )) {
            throw new BusinessRuleException("Ya existe un turno para ese servicio en esa fecha/hora");
        }

        Client client = clientRepository.findByPhoneNormalized(phoneNormalized)
                .orElseGet(() -> {
                    Client created = new Client();
                    created.setName(normalizedClientName);
                    created.setPhone(normalizedClientPhone);
                    created.setPhoneNormalized(phoneNormalized);
                    return created;
                });

        Client persistedClient = clientRepository.save(client);

        Appointment appointment = new Appointment();
        appointment.setClient(persistedClient);
        appointment.setService(service);
        appointment.setAppointmentAt(appointmentAt);
        appointment.setNotes(normalizedNotes);

        try {
            Appointment saved = appointmentRepository.saveAndFlush(appointment);
            return AppointmentMapper.toPublicResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessRuleException("Ya existe un turno para ese servicio en esa fecha/hora");
        }
    }

    @Transactional(readOnly = true)
    public List<PublicOccupiedAppointmentResponse> listOccupiedAppointments(LocalDate date, java.util.UUID serviceId) {
        ServiceCatalog service = serviceCatalogRepository.findById(serviceId)
                .orElseThrow(() -> new NotFoundException("Servicio no encontrado"));

        OffsetDateTime from = date.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime to = date.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        return appointmentRepository
                .findAllByServiceIdAndAppointmentAtGreaterThanEqualAndAppointmentAtLessThan(service.getId(), from, to)
                .stream()
                .filter(appointment -> SLOT_OCCUPYING_STATUSES.contains(appointment.getStatus()))
                .map(appointment -> new PublicOccupiedAppointmentResponse(appointment.getAppointmentAt()))
                .toList();
    }
}
