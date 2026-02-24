package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.AdminMetricsService;
import com.barberia.stylebook.application.service.AdminClientService;
import com.barberia.stylebook.application.service.ManualIncomeService;
import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import com.barberia.stylebook.web.dto.CreateManualIncomeRequest;
import com.barberia.stylebook.web.dto.IncomeMetricsResponse;
import com.barberia.stylebook.web.dto.ManualIncomeEntryResponse;
import com.barberia.stylebook.web.dto.OverviewMetricsResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/metrics")
public class AdminMetricsController {

    private final AdminMetricsService adminMetricsService;
    private final AdminClientService adminClientService;
    private final ManualIncomeService manualIncomeService;

    public AdminMetricsController(
            AdminMetricsService adminMetricsService,
            AdminClientService adminClientService,
            ManualIncomeService manualIncomeService
    ) {
        this.adminMetricsService = adminMetricsService;
        this.adminClientService = adminClientService;
        this.manualIncomeService = manualIncomeService;
    }

    @GetMapping("/overview")
    public ResponseEntity<OverviewMetricsResponse> overview() {
        return ResponseEntity.ok(adminMetricsService.overview());
    }

    @GetMapping("/income")
    public ResponseEntity<IncomeMetricsResponse> income(
            @RequestParam(name = "month", required = false) String month
    ) {
        if (month == null || month.isBlank()) {
            return ResponseEntity.ok(adminMetricsService.income());
        }
        try {
            return ResponseEntity.ok(adminMetricsService.income(YearMonth.parse(month)));
        } catch (DateTimeParseException ex) {
            throw new BusinessRuleException("El mes debe tener formato YYYY-MM");
        }
    }

    @PostMapping("/income/manual")
    public ResponseEntity<ManualIncomeEntryResponse> createManualIncome(
            @Valid @RequestBody CreateManualIncomeRequest request
    ) {
        return ResponseEntity.ok(manualIncomeService.create(request));
    }

    @PutMapping("/income/manual/{id}")
    public ResponseEntity<ManualIncomeEntryResponse> updateManualIncome(
            @PathVariable UUID id,
            @Valid @RequestBody CreateManualIncomeRequest request
    ) {
        return ResponseEntity.ok(manualIncomeService.update(id, request));
    }

    @DeleteMapping("/income/manual/{id}")
    public ResponseEntity<Void> deleteManualIncome(@PathVariable UUID id) {
        manualIncomeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/clients")
    public ResponseEntity<List<ClientSummaryResponse>> clients() {
        return ResponseEntity.ok(adminClientService.list());
    }
}
