package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Client;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ClientRepository;
import com.barberia.stylebook.web.dto.AdminClientUpsertRequest;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminClientService {
    private static final int DEFAULT_PAGE_SIZE = 500;
    private static final int MAX_PAGE_SIZE = 1000;

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
        return list(DEFAULT_PAGE_SIZE);
    }

    @Transactional(readOnly = true)
    public List<ClientSummaryResponse> list(int limit) {
        return list(limit, 0);
    }

    @Transactional(readOnly = true)
    public List<ClientSummaryResponse> list(int limit, int page) {
        int boundedLimit = boundPageSize(limit);
        int boundedPage = Math.max(0, page);
        List<Client> clients = clientRepository.findAll(PageRequest.of(boundedPage, boundedLimit)).toList();
        List<UUID> clientIds = clients.stream().map(Client::getId).toList();
        if (clientIds.isEmpty()) {
            return List.of();
        }

        Map<UUID, AppointmentRepository.ClientCompletedStatsProjection> completedStatsByClientId = appointmentRepository
                .findCompletedStatsByClientIds(AppointmentStatus.COMPLETED, clientIds)
                .stream()
                .collect(Collectors.toMap(
                        AppointmentRepository.ClientCompletedStatsProjection::getClientId,
                        Function.identity()
                ));

        return clients.stream()
                .map(client -> toSummary(client, completedStatsByClientId.get(client.getId())))
                .sorted((left, right) -> {
                    OffsetDateTime leftLastVisit = asOffsetDateTime(left.lastVisit());
                    OffsetDateTime rightLastVisit = asOffsetDateTime(right.lastVisit());
                    return rightLastVisit.compareTo(leftLastVisit);
                })
                .toList();
    }

    @Transactional
    public ClientSummaryResponse update(UUID id, AdminClientUpsertRequest request) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado"));

        String normalizedName = request.name().trim();
        String normalizedPhone = request.phone().trim();
        String phoneNormalized = PhoneNormalizer.normalize(normalizedPhone);
        if (clientRepository.existsByPhoneNormalizedAndIdNot(phoneNormalized, id)) {
            throw new BusinessRuleException("Ya existe otro cliente con ese telefono");
        }

        client.setName(normalizedName);
        client.setPhone(normalizedPhone);
        client.setPhoneNormalized(phoneNormalized);
        Client savedClient = clientRepository.save(client);

        AppointmentRepository.ClientCompletedStatsProjection stats = appointmentRepository
                .findCompletedStatsByClientIds(AppointmentStatus.COMPLETED, List.of(savedClient.getId()))
                .stream()
                .findFirst()
                .orElse(null);
        return toSummary(savedClient, stats);
    }

    @Transactional
    public void delete(UUID id) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Cliente no encontrado"));

        appointmentRepository.deleteAllByClientId(id);
        clientRepository.delete(client);
    }

    @Transactional
    public ClientSummaryResponse merge(UUID sourceClientId, UUID targetClientId) {
        if (sourceClientId.equals(targetClientId)) {
            throw new BusinessRuleException("Selecciona dos clientes distintos para fusionar");
        }

        Client source = clientRepository.findById(sourceClientId)
                .orElseThrow(() -> new NotFoundException("Cliente origen no encontrado"));
        Client target = clientRepository.findById(targetClientId)
                .orElseThrow(() -> new NotFoundException("Cliente destino no encontrado"));

        appointmentRepository.reassignClient(source.getId(), target.getId());
        clientRepository.delete(source);

        AppointmentRepository.ClientCompletedStatsProjection stats = appointmentRepository
                .findCompletedStatsByClientIds(AppointmentStatus.COMPLETED, List.of(target.getId()))
                .stream()
                .findFirst()
                .orElse(null);
        return toSummary(target, stats);
    }

    private ClientSummaryResponse toSummary(
            Client client,
            AppointmentRepository.ClientCompletedStatsProjection completedStats
    ) {
        long completedCount = completedStats == null ? 0 : completedStats.getCompletedCount();
        String lastVisit = completedStats == null || completedStats.getLastCompletedAt() == null
                ? "-"
                : completedStats.getLastCompletedAt().toLocalDate().toString();

        return new ClientSummaryResponse(
                client.getId(),
                client.getName(),
                client.getPhone(),
                completedCount,
                lastVisit
        );
    }

    private OffsetDateTime asOffsetDateTime(String lastVisit) {
        if (lastVisit == null || "-".equals(lastVisit)) {
            return OffsetDateTime.MIN;
        }
        return OffsetDateTime.parse(lastVisit + "T00:00:00Z");
    }

    private int boundPageSize(int requestedLimit) {
        if (requestedLimit <= 0) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(requestedLimit, MAX_PAGE_SIZE);
    }
}
