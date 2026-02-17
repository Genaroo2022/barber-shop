package com.barberia.stylebook.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record IncomeMetricsResponse(
        BigDecimal totalIncome,
        BigDecimal monthlyIncome,
        List<IncomeBreakdownItem> breakdown
) {
}
