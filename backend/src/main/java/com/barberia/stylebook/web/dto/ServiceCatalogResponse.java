package com.barberia.stylebook.web.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record ServiceCatalogResponse(
        UUID id,
        String name,
        BigDecimal price,
        Integer durationMinutes,
        String description,
        Boolean active
) {
}
