package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.ManualIncomeEntry;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ManualIncomeEntryRepository;
import com.barberia.stylebook.web.dto.IncomeBreakdownItem;
import com.barberia.stylebook.web.dto.IncomeMetricsResponse;
import com.barberia.stylebook.web.dto.ManualIncomeEntryResponse;
import com.barberia.stylebook.web.dto.OverviewMetricsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
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
        String popularService = appointmentRepository.findServiceUsageOrderedDesc().stream()
                .findFirst()
                .map(AppointmentRepository.ServiceUsageProjection::getServiceName)
                .orElse("-");

        return new OverviewMetricsResponse(
                appointmentRepository.count(),
                appointmentRepository.countByStatus(AppointmentStatus.PENDING),
                appointmentRepository.countByStatus(AppointmentStatus.COMPLETED),
                appointmentRepository.countDistinctClientPhones(),
                popularService
        );
    }

    @Transactional(readOnly = true)
    public IncomeMetricsResponse income() {
        YearMonth currentMonth = YearMonth.now();
        OffsetDateTime monthFrom = currentMonth.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime monthTo = currentMonth.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        List<ManualIncomeEntry> manualEntries = manualIncomeEntryRepository.findAllByOrderByOccurredOnDescCreatedAtDesc();

        BigDecimal registeredIncome = appointmentRepository.sumServicePriceByStatus(AppointmentStatus.COMPLETED);
        BigDecimal monthlyRegisteredIncome = appointmentRepository
                .sumServicePriceByStatusAndAppointmentAtBetween(AppointmentStatus.COMPLETED, monthFrom, monthTo);
        BigDecimal manualIncome = manualIncomeEntryRepository.sumAmount();
        BigDecimal totalTips = manualIncomeEntryRepository.sumTipAmount();
        BigDecimal monthlyManualIncome = manualIncomeEntryRepository
                .sumAmountAndTipByOccurredOnBetween(currentMonth.atDay(1), currentMonth.plusMonths(1).atDay(1));

        BigDecimal totalIncome = registeredIncome.add(manualIncome).add(totalTips);
        BigDecimal monthlyIncome = monthlyRegisteredIncome.add(monthlyManualIncome);

        Map<String, IncomeAccumulator> byService = new LinkedHashMap<>();
        appointmentRepository.findCompletedIncomeByService(AppointmentStatus.COMPLETED)
                .forEach(serviceIncome -> byService.computeIfAbsent(
                                serviceIncome.getServiceName(),
                                ignored -> new IncomeAccumulator()
                        )
                        .add(serviceIncome.getUsageCount(), serviceIncome.getTotal()));
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
    public IncomeMetricsResponse income(YearMonth month) {
        YearMonth selectedMonth = month == null ? YearMonth.now() : month;
        OffsetDateTime monthFrom = selectedMonth.atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime monthTo = selectedMonth.plusMonths(1).atDay(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        List<ManualIncomeEntry> manualEntries = manualIncomeEntryRepository
                .findAllByOccurredOnGreaterThanEqualAndOccurredOnLessThanOrderByOccurredOnDescCreatedAtDesc(
                        selectedMonth.atDay(1),
                        selectedMonth.plusMonths(1).atDay(1)
                );

        BigDecimal registeredIncome = appointmentRepository
                .sumServicePriceByStatusAndAppointmentAtBetween(AppointmentStatus.COMPLETED, monthFrom, monthTo);

        BigDecimal monthlyRegisteredIncome = registeredIncome;
        BigDecimal manualIncome = manualEntries.stream()
                .map(ManualIncomeEntry::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTips = manualEntries.stream()
                .map(ManualIncomeEntry::getTipAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal monthlyManualIncome = manualIncomeEntryRepository
                .sumAmountAndTipByOccurredOnBetween(selectedMonth.atDay(1), selectedMonth.plusMonths(1).atDay(1));

        BigDecimal totalIncome = registeredIncome.add(manualIncome).add(totalTips);
        BigDecimal monthlyIncome = monthlyRegisteredIncome.add(monthlyManualIncome);

        Map<String, IncomeAccumulator> byService = new LinkedHashMap<>();
        appointmentRepository.findCompletedIncomeByServiceAndAppointmentAtBetween(
                        AppointmentStatus.COMPLETED,
                        monthFrom,
                        monthTo
                )
                .forEach(serviceIncome -> byService.computeIfAbsent(
                                serviceIncome.getServiceName(),
                                ignored -> new IncomeAccumulator()
                        )
                        .add(serviceIncome.getUsageCount(), serviceIncome.getTotal()));
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

    private static class IncomeAccumulator {
        private long count = 0;
        private BigDecimal total = BigDecimal.ZERO;

        private void add(BigDecimal price) {
            this.count++;
            this.total = this.total.add(price);
        }

        private void add(long count, BigDecimal total) {
            this.count += count;
            this.total = this.total.add(total);
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
