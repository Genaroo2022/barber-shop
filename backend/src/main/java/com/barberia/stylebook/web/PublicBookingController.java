package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.BookingService;
import com.barberia.stylebook.application.service.GalleryImageService;
import com.barberia.stylebook.application.service.ServiceCatalogService;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import com.barberia.stylebook.web.dto.GalleryImageResponse;
import com.barberia.stylebook.web.dto.ServiceCatalogResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicBookingController {

    private final BookingService bookingService;
    private final ServiceCatalogService serviceCatalogService;
    private final GalleryImageService galleryImageService;

    public PublicBookingController(
            BookingService bookingService,
            ServiceCatalogService serviceCatalogService,
            GalleryImageService galleryImageService
    ) {
        this.bookingService = bookingService;
        this.serviceCatalogService = serviceCatalogService;
        this.galleryImageService = galleryImageService;
    }

    @PostMapping("/appointments")
    public ResponseEntity<AppointmentResponse> createAppointment(@Valid @RequestBody CreateAppointmentRequest request) {
        return ResponseEntity.ok(bookingService.create(request));
    }

    @GetMapping("/services")
    public ResponseEntity<List<ServiceCatalogResponse>> listServices() {
        return ResponseEntity.ok(serviceCatalogService.listPublic());
    }

    @GetMapping("/gallery")
    public ResponseEntity<List<GalleryImageResponse>> listGallery() {
        return ResponseEntity.ok(galleryImageService.listPublic());
    }
}
