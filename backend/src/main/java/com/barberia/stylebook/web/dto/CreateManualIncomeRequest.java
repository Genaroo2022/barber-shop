package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateManualIncomeRequest(
        @NotNull @DecimalMin(value = "0.00") BigDecimal amount,
        @NotNull @DecimalMin(value = "0.00") BigDecimal tipAmount,
        @NotNull LocalDate occurredOn,
        @Size(max = 255) String notes
) {
}
