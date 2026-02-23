package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.AdminClientService;
import com.barberia.stylebook.web.dto.AdminClientUpsertRequest;
import com.barberia.stylebook.web.dto.ClientSummaryResponse;
import com.barberia.stylebook.web.dto.MergeClientsRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/clients")
public class AdminClientController {

    private final AdminClientService adminClientService;

    public AdminClientController(AdminClientService adminClientService) {
        this.adminClientService = adminClientService;
    }

    @GetMapping
    public ResponseEntity<List<ClientSummaryResponse>> list() {
        return ResponseEntity.ok(adminClientService.list());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientSummaryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody AdminClientUpsertRequest request
    ) {
        return ResponseEntity.ok(adminClientService.update(id, request));
    }

    @PostMapping("/merge")
    public ResponseEntity<ClientSummaryResponse> merge(@Valid @RequestBody MergeClientsRequest request) {
        return ResponseEntity.ok(adminClientService.merge(request.sourceClientId(), request.targetClientId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminClientService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
