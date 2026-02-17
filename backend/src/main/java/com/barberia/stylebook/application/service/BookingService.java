package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.entity.Client;
import com.barberia.stylebook.domain.entity.ServiceCatalog;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ClientRepository;
import com.barberia.stylebook.repository.ServiceCatalogRepository;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
public class BookingService {

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
    public AppointmentResponse create(CreateAppointmentRequest request) {
        ServiceCatalog service = serviceCatalogRepository.findById(request.serviceId())
                .orElseThrow(() -> new NotFoundException("Servicio no encontrado"));

        if (!Boolean.TRUE.equals(service.getActive())) {
            throw new BusinessRuleException("El servicio seleccionado no esta activo");
        }

        OffsetDateTime appointmentAt = request.appointmentAt().withSecond(0).withNano(0);
        if (appointmentRepository.existsByServiceIdAndAppointmentAt(service.getId(), appointmentAt)) {
            throw new BusinessRuleException("Ya existe un turno para ese servicio en esa fecha/hora");
        }

        Client client = clientRepository.findByPhone(request.clientPhone())
                .map(existing -> {
                    existing.setName(request.clientName());
                    return existing;
                })
                .orElseGet(() -> {
                    Client created = new Client();
                    created.setName(request.clientName());
                    created.setPhone(request.clientPhone());
                    return created;
                });

        Client persistedClient = clientRepository.save(client);

        Appointment appointment = new Appointment();
        appointment.setClient(persistedClient);
        appointment.setService(service);
        appointment.setAppointmentAt(appointmentAt);
        appointment.setNotes(request.notes());

        Appointment saved = appointmentRepository.save(appointment);
        return AppointmentMapper.toResponse(saved);
    }
}
