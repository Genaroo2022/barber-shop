package com.barberia.stylebook.web.dto;

public record AdminGalleryUploadSignatureResponse(
        String cloudName,
        String apiKey,
        long timestamp,
        String signature,
        String folder
) {
}
