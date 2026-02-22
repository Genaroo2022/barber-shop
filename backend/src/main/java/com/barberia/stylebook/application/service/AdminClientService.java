package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.entity.Client;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ClientRepository;
import com.barberia.stylebook.web.dto.AdminClientUpsertRequest;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class AdminClientService {

    private final ClientRepository clientRepository;
    private final AppointmentRepository appointmentRepository;

    public AdminClientService(
            ClientRepository clientRepository,
            AppointmentRepository appointmentRepository
    ) {
        this.clientRepository = clientRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public List<ClientSummaryResponse> list() {
        return clientRepository.findAll().stream()
                .map(this::toSummary)
                .sorted(Comparator.comparing(ClientSummaryResponse::lastVisit).reversed())
                .toList();
    }

    @Transactional
    public ClientSummaryResponse update(UUID id, AdminClientUpsertRequest request) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado"));

        String normalizedName = request.name().trim();
        String normalizedPhone = request.phone().trim();
        if (clientRepository.existsByPhoneAndIdNot(normalizedPhone, id)) {
            throw new BusinessRuleException("Ya existe otro cliente con ese telefono");
        }

        client.setName(normalizedName);
        client.setPhone(normalizedPhone);
        return toSummary(clientRepository.save(client));
    }

    @Transactional
    public void delete(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado"));

        appointmentRepository.deleteAllByClientId(id);
        clientRepository.delete(client);
    }

    private ClientSummaryResponse toSummary(Client client) {
        List<Appointment> completedAppointments = appointmentRepository.findAllByClientId(client.getId()).stream()
                .filter(appointment -> appointment.getStatus() == AppointmentStatus.COMPLETED)
                .toList();

        String lastVisit = completedAppointments.stream()
                .max(Comparator.comparing(Appointment::getAppointmentAt))
                .map(appointment -> appointment.getAppointmentAt().toLocalDate().toString())
                .orElse("-");

        return new ClientSummaryResponse(
                client.getId(),
                client.getName(),
                client.getPhone(),
                completedAppointments.size(),
                lastVisit
        );
    }
}
