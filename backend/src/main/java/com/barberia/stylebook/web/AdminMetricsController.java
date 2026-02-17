package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.AdminMetricsService;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import com.barberia.stylebook.web.dto.IncomeMetricsResponse;
import com.barberia.stylebook.web.dto.OverviewMetricsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/metrics")
public class AdminMetricsController {

    private final AdminMetricsService adminMetricsService;

    public AdminMetricsController(AdminMetricsService adminMetricsService) {
        this.adminMetricsService = adminMetricsService;
    }

    @GetMapping("/overview")
    public ResponseEntity<OverviewMetricsResponse> overview() {
        return ResponseEntity.ok(adminMetricsService.overview());
    }

    @GetMapping("/income")
    public ResponseEntity<IncomeMetricsResponse> income() {
        return ResponseEntity.ok(adminMetricsService.income());
    }

    @GetMapping("/clients")
    public ResponseEntity<List<ClientSummaryResponse>> clients() {
        return ResponseEntity.ok(adminMetricsService.clients());
    }
}
