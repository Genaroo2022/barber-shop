package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.ServiceCatalog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ServiceCatalogRepository extends JpaRepository<ServiceCatalog, UUID> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsByIdAndActiveTrue(UUID id);

    List<ServiceCatalog> findAllByActiveTrueOrderByNameAsc();
}
