package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findAllByOrderByAppointmentAtAsc();

    List<Appointment> findAllByClientId(UUID clientId);

    long countByClientIdAndStatus(UUID clientId, AppointmentStatus status);

    List<Appointment> findAllByServiceIdAndAppointmentAtGreaterThanEqualAndAppointmentAtLessThan(
            UUID serviceId,
            OffsetDateTime from,
            OffsetDateTime to
    );

    boolean existsByServiceIdAndAppointmentAt(UUID serviceId, OffsetDateTime appointmentAt);

    boolean existsByServiceIdAndAppointmentAtAndIdNot(UUID serviceId, OffsetDateTime appointmentAt, UUID id);

    boolean existsByServiceId(UUID serviceId);

    void deleteAllByClientId(UUID clientId);
}
