package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.NotBlank;

public record HaircutSuggestionRequest(
        @NotBlank(message = "imageDataUrl es obligatorio")
        String imageDataUrl
) {
}
