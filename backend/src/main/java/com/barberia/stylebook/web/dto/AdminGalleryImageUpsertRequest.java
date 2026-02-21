package com.barberia.stylebook.web.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminGalleryImageUpsertRequest(
        @NotBlank @Size(min = 2, max = 120) String title,
        @Size(max = 60) String category,
        @NotBlank @Size(max = 500) String imageUrl,
        @NotNull @Min(0) Integer sortOrder,
        @NotNull Boolean active
) {
}
