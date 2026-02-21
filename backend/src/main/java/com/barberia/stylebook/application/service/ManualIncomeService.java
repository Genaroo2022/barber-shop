package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.BusinessRuleException;
import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.ManualIncomeEntry;
import com.barberia.stylebook.repository.ManualIncomeEntryRepository;
import com.barberia.stylebook.web.dto.CreateManualIncomeRequest;
import com.barberia.stylebook.web.dto.ManualIncomeEntryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class ManualIncomeService {

    private final ManualIncomeEntryRepository manualIncomeEntryRepository;

    public ManualIncomeService(ManualIncomeEntryRepository manualIncomeEntryRepository) {
        this.manualIncomeEntryRepository = manualIncomeEntryRepository;
    }

    @Transactional
    public ManualIncomeEntryResponse create(CreateManualIncomeRequest request) {
        ManualIncomeEntry entry = new ManualIncomeEntry();
        apply(entry, request);
        return toResponse(manualIncomeEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public List<ManualIncomeEntryResponse> list() {
        return manualIncomeEntryRepository.findAllByOrderByOccurredOnDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ManualIncomeEntryResponse update(UUID id, CreateManualIncomeRequest request) {
        ManualIncomeEntry entry = manualIncomeEntryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ingreso manual no encontrado"));
        apply(entry, request);
        return toResponse(manualIncomeEntryRepository.save(entry));
    }

    @Transactional
    public void delete(UUID id) {
        ManualIncomeEntry entry = manualIncomeEntryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ingreso manual no encontrado"));
        manualIncomeEntryRepository.delete(entry);
    }

    private void apply(ManualIncomeEntry entry, CreateManualIncomeRequest request) {
        BigDecimal amount = request.amount();
        BigDecimal tipAmount = request.tipAmount();
        BigDecimal total = amount.add(tipAmount);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("Ingresa un monto, una propina o ambos");
        }

        entry.setAmount(amount);
        entry.setTipAmount(tipAmount);
        entry.setOccurredOn(request.occurredOn());

        String normalizedNotes = request.notes() == null ? null : request.notes().trim();
        entry.setNotes((normalizedNotes == null || normalizedNotes.isEmpty()) ? null : normalizedNotes);
    }

    private ManualIncomeEntryResponse toResponse(ManualIncomeEntry entry) {
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
