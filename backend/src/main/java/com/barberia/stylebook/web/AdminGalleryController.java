package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.CloudinaryUploadSignatureService;
import com.barberia.stylebook.application.service.GalleryImageService;
import com.barberia.stylebook.web.dto.AdminGalleryImageUpsertRequest;
import com.barberia.stylebook.web.dto.AdminGalleryUploadSignatureResponse;
import com.barberia.stylebook.web.dto.GalleryImageResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/gallery")
public class AdminGalleryController {

    private final GalleryImageService galleryImageService;
    private final CloudinaryUploadSignatureService cloudinaryUploadSignatureService;

    public AdminGalleryController(
            GalleryImageService galleryImageService,
            CloudinaryUploadSignatureService cloudinaryUploadSignatureService
    ) {
        this.galleryImageService = galleryImageService;
        this.cloudinaryUploadSignatureService = cloudinaryUploadSignatureService;
    }

    @GetMapping
    public ResponseEntity<List<GalleryImageResponse>> list(
            @RequestParam(name = "limit", required = false, defaultValue = "500") int limit,
            @RequestParam(name = "page", required = false, defaultValue = "0") int page
    ) {
        return ResponseEntity.ok(galleryImageService.listAdmin(limit, page));
    }

    @GetMapping("/upload-signature")
    public ResponseEntity<AdminGalleryUploadSignatureResponse> uploadSignature() {
        return ResponseEntity.ok(cloudinaryUploadSignatureService.generateUploadSignature());
    }

    @PostMapping
    public ResponseEntity<GalleryImageResponse> create(@Valid @RequestBody AdminGalleryImageUpsertRequest request) {
        return ResponseEntity.ok(galleryImageService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GalleryImageResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody AdminGalleryImageUpsertRequest request
    ) {
        return ResponseEntity.ok(galleryImageService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        galleryImageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
