package com.barberia.stylebook.web.dto;

import java.math.BigDecimal;

public record IncomeBreakdownItem(
        String serviceName,
        long count,
        BigDecimal total
) {
}
