package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.ManualIncomeEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ManualIncomeEntryRepository extends JpaRepository<ManualIncomeEntry, UUID> {

    List<ManualIncomeEntry> findAllByOrderByOccurredOnDescCreatedAtDesc();
}
