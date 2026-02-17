package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findAllByOrderByAppointmentAtAsc();

    boolean existsByServiceIdAndAppointmentAt(UUID serviceId, OffsetDateTime appointmentAt);
}
