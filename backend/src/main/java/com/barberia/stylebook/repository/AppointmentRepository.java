package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    List<Appointment> findAllByClientId(UUID clientId);

    List<Appointment> findAllByOrderByAppointmentAtAsc(Pageable pageable);

    List<Appointment> findAllByAppointmentAtGreaterThanEqualAndAppointmentAtLessThanOrderByAppointmentAtAsc(
            OffsetDateTime from,
            OffsetDateTime to,
            Pageable pageable
    );

    long countByClientIdAndStatus(UUID clientId, AppointmentStatus status);

    long countByStatus(AppointmentStatus status);

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
            order by a.appointmentAt asc
            """)
    List<Appointment> findAllWithClientAndServiceOrderByAppointmentAtAsc();

    @Query("""
            select a
            from Appointment a
            join fetch a.client c
            join fetch a.service s
            where a.appointmentAt >= :from
              and a.appointmentAt < :to
            order by a.appointmentAt asc
            """)
    List<Appointment> findAllWithClientAndServiceByAppointmentAtBetweenOrderByAppointmentAtAsc(
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );

    @Query("""
            select a.client.id as clientId,
                   count(a.id) as completedCount,
                   max(a.appointmentAt) as lastCompletedAt
            from Appointment a
            where a.status = :status
            group by a.client.id
            """)
    List<ClientCompletedStatsProjection> findCompletedStatsByClient(@Param("status") AppointmentStatus status);

    @Query("""
            select a.client.id as clientId,
                   count(a.id) as completedCount,
                   max(a.appointmentAt) as lastCompletedAt
            from Appointment a
            where a.status = :status
              and a.client.id in :clientIds
            group by a.client.id
            """)
    List<ClientCompletedStatsProjection> findCompletedStatsByClientIds(
            @Param("status") AppointmentStatus status,
            @Param("clientIds") Collection<UUID> clientIds
    );

    @Query("""
            select a.service.name as serviceName,
                   count(a.id) as usageCount
            from Appointment a
            group by a.service.name
            order by count(a.id) desc
            """)
    List<ServiceUsageProjection> findServiceUsageOrderedDesc();

    @Query("""
            select count(distinct a.client.phoneNormalized)
            from Appointment a
            """)
    long countDistinctClientPhones();

    @Query("""
            select coalesce(sum(a.service.price), 0)
            from Appointment a
            where a.status = :status
            """)
    BigDecimal sumServicePriceByStatus(@Param("status") AppointmentStatus status);

    @Query("""
            select coalesce(sum(a.service.price), 0)
            from Appointment a
            where a.status = :status
              and a.appointmentAt >= :from
              and a.appointmentAt < :to
            """)
    BigDecimal sumServicePriceByStatusAndAppointmentAtBetween(
            @Param("status") AppointmentStatus status,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );

    @Query("""
            select a.service.name as serviceName,
                   count(a.id) as usageCount,
                   coalesce(sum(a.service.price), 0) as total
            from Appointment a
            where a.status = :status
            group by a.service.name
            """)
    List<CompletedIncomeByServiceProjection> findCompletedIncomeByService(@Param("status") AppointmentStatus status);

    @Query("""
            select a.service.name as serviceName,
                   count(a.id) as usageCount,
                   coalesce(sum(a.service.price), 0) as total
            from Appointment a
            where a.status = :status
              and a.appointmentAt >= :from
              and a.appointmentAt < :to
            group by a.service.name
            """)
    List<CompletedIncomeByServiceProjection> findCompletedIncomeByServiceAndAppointmentAtBetween(
            @Param("status") AppointmentStatus status,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to
    );

    @Query("""
            select a.appointmentAt as appointmentAt
            from Appointment a
            where a.service.id = :serviceId
              and a.appointmentAt >= :from
              and a.appointmentAt < :to
              and a.status in :statuses
            """)
    List<OccupiedSlotProjection> findOccupiedSlotsByServiceAndAppointmentAtBetween(
            @Param("serviceId") UUID serviceId,
            @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to,
            @Param("statuses") Collection<AppointmentStatus> statuses
    );

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

    @Query("""
            select a
            from Appointment a
            join fetch a.client c
            join fetch a.service s
            where a.status in :statuses
              and c.phoneNormalized = :phoneNormalized
              and a.createdAt >= :createdFrom
              and a.appointmentAt > :appointmentAfter
            order by a.createdAt desc
            """)
    List<Appointment> findRecentEligibleByClientPhoneNormalized(
            @Param("statuses") Collection<AppointmentStatus> statuses,
            @Param("phoneNormalized") String phoneNormalized,
            @Param("createdFrom") OffsetDateTime createdFrom,
            @Param("appointmentAfter") OffsetDateTime appointmentAfter,
            Pageable pageable
    );

    @Query("""
            select a
            from Appointment a
            join fetch a.client c
            join fetch a.service s
            where a.status = :status
              and a.createdAt <= :createdBefore
            order by a.createdAt asc
            """)
    List<Appointment> findByStatusAndCreatedAtBeforeOrderByCreatedAtAsc(
            @Param("status") AppointmentStatus status,
            @Param("createdBefore") OffsetDateTime createdBefore
    );

    @Modifying
    @Query(value = """
            update appointments
            set client_id = :targetClientId
            where client_id = :sourceClientId
            """, nativeQuery = true)
    int reassignClient(@Param("sourceClientId") UUID sourceClientId, @Param("targetClientId") UUID targetClientId);

    interface ClientCompletedStatsProjection {
        UUID getClientId();
        long getCompletedCount();
        OffsetDateTime getLastCompletedAt();
    }

    interface ServiceUsageProjection {
        String getServiceName();
        long getUsageCount();
    }

    interface CompletedIncomeByServiceProjection {
        String getServiceName();
        long getUsageCount();
        BigDecimal getTotal();
    }

    interface OccupiedSlotProjection {
        OffsetDateTime getAppointmentAt();
    }
}
