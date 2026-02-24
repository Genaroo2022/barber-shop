package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.ManualIncomeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ManualIncomeEntryRepository extends JpaRepository<ManualIncomeEntry, UUID> {

    List<ManualIncomeEntry> findAllByOrderByOccurredOnDescCreatedAtDesc();

    List<ManualIncomeEntry> findAllByOccurredOnGreaterThanEqualAndOccurredOnLessThanOrderByOccurredOnDescCreatedAtDesc(
            LocalDate from,
            LocalDate to
    );

    @Query("select coalesce(sum(m.amount), 0) from ManualIncomeEntry m")
    BigDecimal sumAmount();

    @Query("select coalesce(sum(m.tipAmount), 0) from ManualIncomeEntry m")
    BigDecimal sumTipAmount();

    @Query("""
            select coalesce(sum(m.amount + m.tipAmount), 0)
            from ManualIncomeEntry m
            where m.occurredOn >= :from
              and m.occurredOn < :to
            """)
    BigDecimal sumAmountAndTipByOccurredOnBetween(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
