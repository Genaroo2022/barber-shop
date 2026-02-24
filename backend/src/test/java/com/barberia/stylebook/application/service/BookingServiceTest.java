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
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private ServiceCatalogRepository serviceCatalogRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private BookingService bookingService;

    @Test
    void create_throwsWhenServiceDoesNotExist() {
        UUID serviceId = UUID.randomUUID();
        CreateAppointmentRequest request = request(serviceId, "+5491111111111", "Juan");
        when(serviceCatalogRepository.findById(serviceId)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> bookingService.create(request));
        verify(clientRepository, never()).save(any(Client.class));
        verify(appointmentRepository, never()).saveAndFlush(any(Appointment.class));
    }

    @Test
    void create_throwsWhenServiceIsInactive() {
        ServiceCatalog service = buildService(false);
        CreateAppointmentRequest request = request(service.getId(), "+5491111111111", "Juan");
        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));

        assertThrows(BusinessRuleException.class, () -> bookingService.create(request));
        verify(clientRepository, never()).save(any(Client.class));
        verify(appointmentRepository, never()).saveAndFlush(any(Appointment.class));
    }

    @Test
    void create_throwsWhenSlotAlreadyExists() {
        ServiceCatalog service = buildService(true);
        CreateAppointmentRequest request = request(service.getId(), "+5491111111111", "Juan");
        OffsetDateTime normalizedAt = request.appointmentAt().withSecond(0).withNano(0);

        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));
        when(appointmentRepository.existsByServiceIdAndAppointmentAtAndStatusIn(eq(service.getId()), eq(normalizedAt), any()))
                .thenReturn(true);

        assertThrows(BusinessRuleException.class, () -> bookingService.create(request));
        verify(clientRepository, never()).save(any(Client.class));
        verify(appointmentRepository, never()).saveAndFlush(any(Appointment.class));
    }

    @Test
    void create_createsNewClientAndAppointment() {
        ServiceCatalog service = buildService(true);
        CreateAppointmentRequest request = request(service.getId(), "+5491111111111", "Juan");
        OffsetDateTime normalizedAt = request.appointmentAt().withSecond(0).withNano(0);

        Client newClient = new Client();
        newClient.setName(request.clientName());
        newClient.setPhone(request.clientPhone());
        ReflectionTestUtils.setField(newClient, "id", UUID.randomUUID());

        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));
        when(appointmentRepository.existsByServiceIdAndAppointmentAtAndStatusIn(eq(service.getId()), eq(normalizedAt), any()))
                .thenReturn(false);
        when(clientRepository.findByPhoneNormalized(PhoneNormalizer.normalize(request.clientPhone()))).thenReturn(Optional.empty());
        when(clientRepository.save(any(Client.class))).thenReturn(newClient);
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment apt = invocation.getArgument(0);
            ReflectionTestUtils.setField(apt, "id", UUID.randomUUID());
            apt.setStatus(AppointmentStatus.PENDING);
            return apt;
        });

        PublicAppointmentResponse response = bookingService.create(request);

        assertEquals(service.getId(), response.serviceId());
        assertEquals(service.getName(), response.serviceName());
        assertEquals(AppointmentStatus.PENDING, response.status());
        verify(clientRepository).save(any(Client.class));
        verify(appointmentRepository).saveAndFlush(any(Appointment.class));
    }

    @Test
    void create_keepsExistingClientName() {
        ServiceCatalog service = buildService(true);
        CreateAppointmentRequest request = request(service.getId(), "+5491111111111", "Juan Actualizado");
        OffsetDateTime normalizedAt = request.appointmentAt().withSecond(0).withNano(0);

        Client existing = new Client();
        existing.setName("Juan Viejo");
        existing.setPhone(request.clientPhone());
        ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());

        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));
        when(appointmentRepository.existsByServiceIdAndAppointmentAtAndStatusIn(eq(service.getId()), eq(normalizedAt), any()))
                .thenReturn(false);
        when(clientRepository.findByPhoneNormalized(PhoneNormalizer.normalize(request.clientPhone()))).thenReturn(Optional.of(existing));
        when(clientRepository.save(existing)).thenReturn(existing);
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.create(request);

        assertEquals("Juan Viejo", existing.getName());
        verify(clientRepository).save(eq(existing));
    }

    @Test
    void listOccupiedAppointments_onlyReturnsPendingOrConfirmed() {
        ServiceCatalog service = buildService(true);
        LocalDate date = LocalDate.of(2026, 2, 20);
        OffsetDateTime pendingAt = date.atTime(10, 0).atOffset(ZoneOffset.UTC);
        OffsetDateTime completedAt = date.atTime(10, 30).atOffset(ZoneOffset.UTC);
        OffsetDateTime confirmedAt = date.atTime(11, 0).atOffset(ZoneOffset.UTC);

        Appointment pending = new Appointment();
        pending.setService(service);
        pending.setAppointmentAt(pendingAt);
        pending.setStatus(AppointmentStatus.PENDING);

        Appointment completed = new Appointment();
        completed.setService(service);
        completed.setAppointmentAt(completedAt);
        completed.setStatus(AppointmentStatus.COMPLETED);

        Appointment confirmed = new Appointment();
        confirmed.setService(service);
        confirmed.setAppointmentAt(confirmedAt);
        confirmed.setStatus(AppointmentStatus.CONFIRMED);

        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));
        when(appointmentRepository.findAllByServiceIdAndAppointmentAtGreaterThanEqualAndAppointmentAtLessThan(
                eq(service.getId()),
                any(OffsetDateTime.class),
                any(OffsetDateTime.class)
        )).thenReturn(List.of(pending, completed, confirmed));

        List<PublicOccupiedAppointmentResponse> occupied = bookingService.listOccupiedAppointments(date, service.getId());

        assertEquals(2, occupied.size());
        assertEquals(List.of(pendingAt, confirmedAt), occupied.stream().map(PublicOccupiedAppointmentResponse::appointmentAt).toList());
    }

    private CreateAppointmentRequest request(UUID serviceId, String phone, String name) {
        return new CreateAppointmentRequest(
                name,
                phone,
                serviceId,
                OffsetDateTime.now().plusDays(1).withNano(0),
                "Sin notas"
        );
    }

    private ServiceCatalog buildService(boolean active) {
        ServiceCatalog service = new ServiceCatalog();
        ReflectionTestUtils.setField(service, "id", UUID.randomUUID());
        service.setName("Corte de Cabello");
        service.setPrice(BigDecimal.valueOf(5000));
        service.setDurationMinutes(30);
        service.setActive(active);
        return service;
    }
}
