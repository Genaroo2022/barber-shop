package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import com.barberia.stylebook.web.dto.IncomeBreakdownItem;
import com.barberia.stylebook.web.dto.IncomeMetricsResponse;
import com.barberia.stylebook.web.dto.OverviewMetricsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminMetricsService {

    private final AppointmentRepository appointmentRepository;

    public AdminMetricsService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    public OverviewMetricsResponse overview() {
        List<Appointment> appointments = appointmentRepository.findAll();
        Map<String, Long> serviceUsage = appointments.stream()
                .collect(java.util.stream.Collectors.groupingBy(a -> a.getService().getName(), java.util.stream.Collectors.counting()));
        String popularService = serviceUsage.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("-");

        long uniqueClients = appointments.stream()
                .map(a -> a.getClient().getPhone())
                .distinct()
                .count();

        return new OverviewMetricsResponse(
                appointments.size(),
                appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.PENDING).count(),
                appointments.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count(),
                uniqueClients,
                popularService
        );
    }

    @Transactional(readOnly = true)
    public IncomeMetricsResponse income() {
        List<Appointment> completed = appointmentRepository.findAll().stream()
                .filter(a -> a.getStatus() == AppointmentStatus.COMPLETED)
                .toList();

        BigDecimal totalIncome = completed.stream()
                .map(a -> a.getService().getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        YearMonth currentMonth = YearMonth.now();
        BigDecimal monthlyIncome = completed.stream()
                .filter(a -> YearMonth.from(a.getAppointmentAt()).equals(currentMonth))
                .map(a -> a.getService().getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, IncomeAccumulator> byService = new LinkedHashMap<>();
        completed.forEach(a -> byService.computeIfAbsent(a.getService().getName(), name -> new IncomeAccumulator())
                .add(a.getService().getPrice()));

        List<IncomeBreakdownItem> breakdown = byService.entrySet().stream()
                .map(e -> new IncomeBreakdownItem(e.getKey(), e.getValue().count, e.getValue().total))
                .sorted(Comparator.comparing(IncomeBreakdownItem::total).reversed())
                .toList();

        return new IncomeMetricsResponse(totalIncome, monthlyIncome, breakdown);
    }

    @Transactional(readOnly = true)
    public List<ClientSummaryResponse> clients() {
        Map<String, List<Appointment>> byPhone = appointmentRepository.findAll().stream()
                .collect(java.util.stream.Collectors.groupingBy(a -> a.getClient().getPhone()));

        return byPhone.values().stream()
                .map(list -> {
                    Appointment latest = list.stream()
                            .max(Comparator.comparing(Appointment::getAppointmentAt))
                            .orElseThrow();
                    return new ClientSummaryResponse(
                            latest.getClient().getName(),
                            latest.getClient().getPhone(),
                            list.size(),
                            latest.getAppointmentAt().toLocalDate().toString()
                    );
                })
                .sorted(Comparator.comparing(ClientSummaryResponse::lastVisit).reversed())
                .toList();
    }

    private static class IncomeAccumulator {
        private long count = 0;
        private BigDecimal total = BigDecimal.ZERO;

        private void add(BigDecimal price) {
            this.count++;
            this.total = this.total.add(price);
        }
    }
}
