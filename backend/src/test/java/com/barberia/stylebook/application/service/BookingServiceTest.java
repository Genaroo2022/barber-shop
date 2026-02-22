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
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
        when(appointmentRepository.existsByServiceIdAndAppointmentAt(service.getId(), normalizedAt)).thenReturn(true);

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
        when(appointmentRepository.existsByServiceIdAndAppointmentAt(service.getId(), normalizedAt)).thenReturn(false);
        when(clientRepository.findByPhone(request.clientPhone())).thenReturn(Optional.empty());
        when(clientRepository.save(any(Client.class))).thenReturn(newClient);
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment apt = invocation.getArgument(0);
            ReflectionTestUtils.setField(apt, "id", UUID.randomUUID());
            apt.setStatus(AppointmentStatus.PENDING);
            return apt;
        });

        AppointmentResponse response = bookingService.create(request);

        assertEquals("Juan", response.clientName());
        assertEquals(service.getName(), response.serviceName());
        assertEquals(AppointmentStatus.PENDING, response.status());
        verify(clientRepository).save(any(Client.class));
        verify(appointmentRepository).saveAndFlush(any(Appointment.class));
    }

    @Test
    void create_updatesExistingClientName() {
        ServiceCatalog service = buildService(true);
        CreateAppointmentRequest request = request(service.getId(), "+5491111111111", "Juan Actualizado");
        OffsetDateTime normalizedAt = request.appointmentAt().withSecond(0).withNano(0);

        Client existing = new Client();
        existing.setName("Juan Viejo");
        existing.setPhone(request.clientPhone());
        ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());

        when(serviceCatalogRepository.findById(service.getId())).thenReturn(Optional.of(service));
        when(appointmentRepository.existsByServiceIdAndAppointmentAt(service.getId(), normalizedAt)).thenReturn(false);
        when(clientRepository.findByPhone(request.clientPhone())).thenReturn(Optional.of(existing));
        when(clientRepository.save(existing)).thenReturn(existing);
        when(appointmentRepository.saveAndFlush(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        bookingService.create(request);

        assertEquals("Juan Actualizado", existing.getName());
        verify(clientRepository).save(eq(existing));
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
