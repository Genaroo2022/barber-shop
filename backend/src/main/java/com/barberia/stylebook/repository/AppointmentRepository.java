package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Collection;
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

    boolean existsByServiceIdAndAppointmentAtAndStatusIn(
            UUID serviceId,
            OffsetDateTime appointmentAt,
            Collection<AppointmentStatus> statuses
    );

    boolean existsByServiceIdAndAppointmentAtAndStatusInAndIdNot(
            UUID serviceId,
            OffsetDateTime appointmentAt,
            Collection<AppointmentStatus> statuses,
            UUID id
    );

    boolean existsByServiceId(UUID serviceId);

    void deleteAllByClientId(UUID clientId);

    @Query("""
            select a
            from Appointment a
            join fetch a.client c
            join fetch a.service s
            where a.status in :statuses
              and a.createdAt >= :createdFrom
            order by a.createdAt desc
            """)
    List<Appointment> findRecentByStatusesAndCreatedAtAfter(
            @Param("statuses") Collection<AppointmentStatus> statuses,
            @Param("createdFrom") OffsetDateTime createdFrom
    );
}
