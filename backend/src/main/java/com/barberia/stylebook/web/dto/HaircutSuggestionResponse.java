package com.barberia.stylebook.web.dto;

import java.util.List;

public record HaircutSuggestionResponse(
        String detectedDescription,
        List<HaircutSuggestionItemResponse> suggestions,
        String previewImageDataUrl,
        String previewStyleName,
        String previewMessage
) {
}
