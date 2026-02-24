package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.BookingService;
import com.barberia.stylebook.application.service.GalleryImageService;
import com.barberia.stylebook.application.service.ServiceCatalogService;
import com.barberia.stylebook.security.BookingRateLimiter;
import com.barberia.stylebook.security.ClientIpResolver;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import com.barberia.stylebook.web.dto.GalleryImageResponse;
import com.barberia.stylebook.web.dto.PublicAppointmentResponse;
import com.barberia.stylebook.web.dto.PublicOccupiedAppointmentResponse;
import com.barberia.stylebook.web.dto.ServiceCatalogResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/public")
public class PublicBookingController {

    private final BookingService bookingService;
    private final ServiceCatalogService serviceCatalogService;
    private final GalleryImageService galleryImageService;
    private final BookingRateLimiter bookingRateLimiter;
    private final ClientIpResolver clientIpResolver;

    public PublicBookingController(
            BookingService bookingService,
            ServiceCatalogService serviceCatalogService,
            GalleryImageService galleryImageService,
            BookingRateLimiter bookingRateLimiter,
            ClientIpResolver clientIpResolver
    ) {
        this.bookingService = bookingService;
        this.serviceCatalogService = serviceCatalogService;
        this.galleryImageService = galleryImageService;
        this.bookingRateLimiter = bookingRateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/appointments")
    public ResponseEntity<PublicAppointmentResponse> createAppointment(
            @Valid @RequestBody CreateAppointmentRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver.resolve(httpRequest);
        bookingRateLimiter.checkAllowed(clientIp);
        bookingRateLimiter.recordAttempt(clientIp);
        return ResponseEntity.ok(bookingService.create(request));
    }

    @GetMapping("/appointments/occupied")
    public ResponseEntity<List<PublicOccupiedAppointmentResponse>> listOccupied(
            @RequestParam UUID serviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(bookingService.listOccupiedAppointments(date, serviceId));
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
