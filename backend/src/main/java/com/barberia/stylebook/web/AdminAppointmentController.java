package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.AdminAppointmentService;
import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.web.dto.AdminAppointmentUpsertRequest;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.StalePendingAppointmentResponse;
import com.barberia.stylebook.web.dto.UpdateAppointmentStatusRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
@RequestMapping("/api/admin/appointments")
public class AdminAppointmentController {

    private final AdminAppointmentService adminAppointmentService;

    public AdminAppointmentController(AdminAppointmentService adminAppointmentService) {
        this.adminAppointmentService = adminAppointmentService;
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> list(
            @RequestParam(name = "month", required = false) String month,
            @RequestParam(name = "limit", required = false, defaultValue = "500") int limit,
            @RequestParam(name = "page", required = false, defaultValue = "0") int page
    ) {
        if (month == null || month.isBlank()) {
            return ResponseEntity.ok(adminAppointmentService.listAll(limit, page));
        }
        try {
            return ResponseEntity.ok(adminAppointmentService.listByMonth(YearMonth.parse(month), limit, page));
        } catch (DateTimeParseException ex) {
            throw new BusinessRuleException("El mes debe tener formato YYYY-MM");
        }
    }

    @GetMapping("/stale-pending")
    public ResponseEntity<List<StalePendingAppointmentResponse>> listStalePending(
            @RequestParam(name = "olderThanMinutes", defaultValue = "30") int olderThanMinutes
    ) {
        return ResponseEntity.ok(adminAppointmentService.listStalePending(olderThanMinutes));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAppointmentStatusRequest request
    ) {
        return ResponseEntity.ok(adminAppointmentService.updateStatus(id, request.status()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody AdminAppointmentUpsertRequest request
    ) {
        return ResponseEntity.ok(adminAppointmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminAppointmentService.delete(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
