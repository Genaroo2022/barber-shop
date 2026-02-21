package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.ServiceCatalogService;
import com.barberia.stylebook.web.dto.AdminServiceUpsertRequest;
import com.barberia.stylebook.web.dto.ServiceCatalogResponse;
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
@RequestMapping("/api/admin/services")
public class AdminServiceCatalogController {

    private final ServiceCatalogService serviceCatalogService;

    public AdminServiceCatalogController(ServiceCatalogService serviceCatalogService) {
        this.serviceCatalogService = serviceCatalogService;
    }

    @GetMapping
    public ResponseEntity<List<ServiceCatalogResponse>> list() {
        return ResponseEntity.ok(serviceCatalogService.listAdmin());
    }

    @PostMapping
    public ResponseEntity<ServiceCatalogResponse> create(@Valid @RequestBody AdminServiceUpsertRequest request) {
        return ResponseEntity.ok(serviceCatalogService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceCatalogResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody AdminServiceUpsertRequest request
    ) {
        return ResponseEntity.ok(serviceCatalogService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        serviceCatalogService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
