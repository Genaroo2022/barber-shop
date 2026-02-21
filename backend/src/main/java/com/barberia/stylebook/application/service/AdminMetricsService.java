package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.entity.ManualIncomeEntry;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ManualIncomeEntryRepository;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import com.barberia.stylebook.web.dto.IncomeBreakdownItem;
import com.barberia.stylebook.web.dto.IncomeMetricsResponse;
import com.barberia.stylebook.web.dto.ManualIncomeEntryResponse;
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
    private final ManualIncomeEntryRepository manualIncomeEntryRepository;

    public AdminMetricsService(
            AppointmentRepository appointmentRepository,
            ManualIncomeEntryRepository manualIncomeEntryRepository
    ) {
        this.appointmentRepository = appointmentRepository;
        this.manualIncomeEntryRepository = manualIncomeEntryRepository;
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
        List<ManualIncomeEntry> manualEntries = manualIncomeEntryRepository.findAllByOrderByOccurredOnDescCreatedAtDesc();

        BigDecimal registeredIncome = completed.stream()
                .map(a -> a.getService().getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        YearMonth currentMonth = YearMonth.now();
        BigDecimal monthlyRegisteredIncome = completed.stream()
                .filter(a -> YearMonth.from(a.getAppointmentAt()).equals(currentMonth))
                .map(a -> a.getService().getPrice())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal manualIncome = manualEntries.stream()
                .map(ManualIncomeEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTips = manualEntries.stream()
                .map(ManualIncomeEntry::getTipAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyManualIncome = manualEntries.stream()
                .filter(entry -> YearMonth.from(entry.getOccurredOn()).equals(currentMonth))
                .map(entry -> entry.getAmount().add(entry.getTipAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalIncome = registeredIncome.add(manualIncome).add(totalTips);
        BigDecimal monthlyIncome = monthlyRegisteredIncome.add(monthlyManualIncome);

        Map<String, IncomeAccumulator> byService = new LinkedHashMap<>();
        completed.forEach(a -> byService.computeIfAbsent(a.getService().getName(), name -> new IncomeAccumulator())
                .add(a.getService().getPrice()));
        manualEntries.forEach(entry -> byService.computeIfAbsent("Ingresos manuales", name -> new IncomeAccumulator())
                .add(entry.getAmount()));
        manualEntries.stream()
                .filter(entry -> entry.getTipAmount().compareTo(BigDecimal.ZERO) > 0)
                .forEach(entry -> byService.computeIfAbsent("Propinas", name -> new IncomeAccumulator())
                        .add(entry.getTipAmount()));

        List<IncomeBreakdownItem> breakdown = byService.entrySet().stream()
                .map(e -> new IncomeBreakdownItem(e.getKey(), e.getValue().count, e.getValue().total))
                .sorted(Comparator.comparing(IncomeBreakdownItem::total).reversed())
                .toList();
        List<ManualIncomeEntryResponse> manualEntryResponses = manualEntries.stream()
                .map(this::toManualEntryResponse)
                .toList();

        return new IncomeMetricsResponse(
                registeredIncome,
                manualIncome,
                totalTips,
                totalIncome,
                monthlyIncome,
                breakdown,
                manualEntryResponses
        );
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

    private ManualIncomeEntryResponse toManualEntryResponse(ManualIncomeEntry entry) {
        return new ManualIncomeEntryResponse(
                entry.getId(),
                entry.getAmount(),
                entry.getTipAmount(),
                entry.getAmount().add(entry.getTipAmount()),
                entry.getOccurredOn(),
                entry.getNotes()
        );
    }
}
