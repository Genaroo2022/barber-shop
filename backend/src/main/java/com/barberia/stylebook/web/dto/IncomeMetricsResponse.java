package com.barberia.stylebook.web.dto;

import java.math.BigDecimal;
import java.util.List;

public record IncomeMetricsResponse(
        BigDecimal registeredIncome,
        BigDecimal manualIncome,
        BigDecimal totalTips,
        BigDecimal totalIncome,
        BigDecimal monthlyIncome,
        List<IncomeBreakdownItem> breakdown,
        List<ManualIncomeEntryResponse> manualEntries
) {
}
