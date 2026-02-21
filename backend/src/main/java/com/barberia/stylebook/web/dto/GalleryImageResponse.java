package com.barberia.stylebook.web.dto;

import java.util.UUID;

public record GalleryImageResponse(
        UUID id,
        String title,
        String category,
        String imageUrl,
        Integer sortOrder,
        Boolean active
) {
}
