package com.barberia.stylebook.web.dto;

public record HaircutSuggestionItemResponse(
        String styleName,
        String reason,
        String maintenance
) {
}
