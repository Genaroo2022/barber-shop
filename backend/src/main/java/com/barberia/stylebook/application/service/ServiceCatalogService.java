package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.ServiceCatalog;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.barberia.stylebook.repository.ServiceCatalogRepository;
import com.barberia.stylebook.web.dto.AdminServiceUpsertRequest;
import com.barberia.stylebook.web.dto.ServiceCatalogResponse;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ServiceCatalogService {

    private final ServiceCatalogRepository serviceCatalogRepository;
    private final AppointmentRepository appointmentRepository;

    public ServiceCatalogService(
            ServiceCatalogRepository serviceCatalogRepository,
            AppointmentRepository appointmentRepository
    ) {
        this.serviceCatalogRepository = serviceCatalogRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "publicServices")
    public List<ServiceCatalogResponse> listPublic() {
        return serviceCatalogRepository.findAllByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceCatalogResponse> listAdmin() {
        return serviceCatalogRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = "publicServices", allEntries = true)
    public ServiceCatalogResponse create(AdminServiceUpsertRequest request) {
        String normalizedName = request.name().trim();
        if (serviceCatalogRepository.existsByNameIgnoreCase(normalizedName)) {
            throw new BusinessRuleException("Ya existe un servicio con ese nombre");
        }

        ServiceCatalog service = new ServiceCatalog();
        apply(service, request, normalizedName);
        return toResponse(serviceCatalogRepository.save(service));
    }

    @Transactional
    @CacheEvict(cacheNames = "publicServices", allEntries = true)
    public ServiceCatalogResponse update(UUID id, AdminServiceUpsertRequest request) {
        ServiceCatalog service = serviceCatalogRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Servicio no encontrado"));
        String normalizedName = request.name().trim();

        if (serviceCatalogRepository.existsByNameIgnoreCaseAndIdNot(normalizedName, id)) {
            throw new BusinessRuleException("Ya existe un servicio con ese nombre");
        }

        apply(service, request, normalizedName);
        return toResponse(serviceCatalogRepository.save(service));
    }

    @Transactional
    @CacheEvict(cacheNames = "publicServices", allEntries = true)
    public void delete(UUID id) {
        ServiceCatalog service = serviceCatalogRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Servicio no encontrado"));

        if (appointmentRepository.existsByServiceId(service.getId())) {
            throw new BusinessRuleException("No se puede eliminar: el servicio tiene turnos asociados");
        }

        serviceCatalogRepository.delete(service);
    }

    private void apply(ServiceCatalog service, AdminServiceUpsertRequest request, String normalizedName) {
        String normalizedDescription = request.description() == null ? null : request.description().trim();

        service.setName(normalizedName);
        service.setPrice(request.price());
        service.setDurationMinutes(request.durationMinutes());
        service.setDescription((normalizedDescription == null || normalizedDescription.isEmpty()) ? null : normalizedDescription);
        service.setActive(request.active());
    }

    private ServiceCatalogResponse toResponse(ServiceCatalog service) {
        return new ServiceCatalogResponse(
                service.getId(),
                service.getName(),
                service.getPrice(),
                service.getDurationMinutes(),
                service.getDescription(),
                service.getActive()
        );
    }
}
