package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.entity.Client;
import com.barberia.stylebook.domain.entity.ServiceCatalog;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @InjectMocks
    private AdminAppointmentService service;

    @Test
    void updateStatus_allowsPendingToConfirmed() {
        UUID appointmentId = UUID.randomUUID();
        Appointment appointment = buildAppointment(AppointmentStatus.PENDING);

        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppointmentResponse response = service.updateStatus(appointmentId, AppointmentStatus.CONFIRMED);

        assertEquals(AppointmentStatus.CONFIRMED, response.status());
        verify(appointmentRepository).save(appointment);
    }

    @Test
    void updateStatus_rejectsInvalidTransition() {
        UUID appointmentId = UUID.randomUUID();
        Appointment appointment = buildAppointment(AppointmentStatus.COMPLETED);
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.of(appointment));

        assertThrows(
                BusinessRuleException.class,
                () -> service.updateStatus(appointmentId, AppointmentStatus.PENDING)
        );
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    void updateStatus_throwsWhenAppointmentNotFound() {
        UUID appointmentId = UUID.randomUUID();
        when(appointmentRepository.findById(appointmentId)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> service.updateStatus(appointmentId, AppointmentStatus.CONFIRMED)
        );
        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    private Appointment buildAppointment(AppointmentStatus status) {
        Client client = new Client();
        client.setName("Juan");
        client.setPhone("+5491111111111");
        ReflectionTestUtils.setField(client, "id", UUID.randomUUID());

        ServiceCatalog serviceCatalog = new ServiceCatalog();
        serviceCatalog.setName("Corte de Cabello");
        ReflectionTestUtils.setField(serviceCatalog, "id", UUID.randomUUID());

        Appointment appointment = new Appointment();
        ReflectionTestUtils.setField(appointment, "id", UUID.randomUUID());
        appointment.setClient(client);
        appointment.setService(serviceCatalog);
        appointment.setStatus(status);
        return appointment;
    }
}
