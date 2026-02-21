package com.barberia.stylebook.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ManualIncomeEntryResponse(
        UUID id,
        BigDecimal amount,
        BigDecimal tipAmount,
        BigDecimal total,
        LocalDate occurredOn,
        String notes
) {
}
