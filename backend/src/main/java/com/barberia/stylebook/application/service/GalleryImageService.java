package com.barberia.stylebook.application.service;

import com.barberia.stylebook.application.exception.NotFoundException;
import com.barberia.stylebook.domain.entity.GalleryImage;
import com.barberia.stylebook.repository.GalleryImageRepository;
import com.barberia.stylebook.web.dto.AdminGalleryImageUpsertRequest;
import com.barberia.stylebook.web.dto.GalleryImageResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class GalleryImageService {

    private final GalleryImageRepository galleryImageRepository;

    public GalleryImageService(GalleryImageRepository galleryImageRepository) {
        this.galleryImageRepository = galleryImageRepository;
    }

    @Transactional(readOnly = true)
    public List<GalleryImageResponse> listPublic() {
        return galleryImageRepository.findAllByActiveTrueOrderBySortOrderAscCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GalleryImageResponse> listAdmin() {
        return galleryImageRepository.findAllByOrderBySortOrderAscCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public GalleryImageResponse create(AdminGalleryImageUpsertRequest request) {
        GalleryImage image = new GalleryImage();
        apply(image, request);
        return toResponse(galleryImageRepository.save(image));
    }

    @Transactional
    public GalleryImageResponse update(UUID id, AdminGalleryImageUpsertRequest request) {
        GalleryImage image = galleryImageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Imagen no encontrada"));

        apply(image, request);
        return toResponse(galleryImageRepository.save(image));
    }

    @Transactional
    public void delete(UUID id) {
        GalleryImage image = galleryImageRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Imagen no encontrada"));
        galleryImageRepository.delete(image);
    }

    private void apply(GalleryImage image, AdminGalleryImageUpsertRequest request) {
        String normalizedTitle = request.title().trim();
        String normalizedCategory = request.category() == null ? null : request.category().trim();
        String normalizedUrl = request.imageUrl().trim();

        image.setTitle(normalizedTitle);
        image.setCategory((normalizedCategory == null || normalizedCategory.isEmpty()) ? null : normalizedCategory);
        image.setImageUrl(normalizedUrl);
        image.setSortOrder(request.sortOrder());
        image.setActive(request.active());
    }

    private GalleryImageResponse toResponse(GalleryImage image) {
        return new GalleryImageResponse(
                image.getId(),
                image.getTitle(),
                image.getCategory(),
                image.getImageUrl(),
                image.getSortOrder(),
                image.getActive()
        );
    }
}
