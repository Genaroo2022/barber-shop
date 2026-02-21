package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record AdminServiceUpsertRequest(
        @NotBlank @Size(min = 2, max = 120) String name,
        @NotNull @DecimalMin(value = "0.00") BigDecimal price,
        @NotNull @Positive Integer durationMinutes,
        @NotNull Boolean active
) {
}
