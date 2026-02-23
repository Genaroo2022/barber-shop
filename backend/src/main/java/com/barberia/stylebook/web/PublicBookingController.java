package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.BookingService;
import com.barberia.stylebook.application.service.GalleryImageService;
import com.barberia.stylebook.application.service.HaircutSuggestionService;
import com.barberia.stylebook.application.exception.TooManyRequestsException;
import com.barberia.stylebook.application.service.ServiceCatalogService;
import com.barberia.stylebook.security.BookingRateLimiter;
import com.barberia.stylebook.security.ClientIpResolver;
import com.barberia.stylebook.security.HaircutAiConcurrencyLimiter;
import com.barberia.stylebook.security.HaircutAiRateLimiter;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import com.barberia.stylebook.web.dto.GalleryImageResponse;
import com.barberia.stylebook.web.dto.HaircutSuggestionRequest;
import com.barberia.stylebook.web.dto.HaircutSuggestionResponse;
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
    private final HaircutSuggestionService haircutSuggestionService;
    private final BookingRateLimiter bookingRateLimiter;
    private final HaircutAiConcurrencyLimiter haircutAiConcurrencyLimiter;
    private final HaircutAiRateLimiter haircutAiRateLimiter;
    private final ClientIpResolver clientIpResolver;

    public PublicBookingController(
            BookingService bookingService,
            ServiceCatalogService serviceCatalogService,
            GalleryImageService galleryImageService,
            HaircutSuggestionService haircutSuggestionService,
            BookingRateLimiter bookingRateLimiter,
            HaircutAiConcurrencyLimiter haircutAiConcurrencyLimiter,
            HaircutAiRateLimiter haircutAiRateLimiter,
            ClientIpResolver clientIpResolver
    ) {
        this.bookingService = bookingService;
        this.serviceCatalogService = serviceCatalogService;
        this.galleryImageService = galleryImageService;
        this.haircutSuggestionService = haircutSuggestionService;
        this.bookingRateLimiter = bookingRateLimiter;
        this.haircutAiConcurrencyLimiter = haircutAiConcurrencyLimiter;
        this.haircutAiRateLimiter = haircutAiRateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping("/appointments")
    public ResponseEntity<AppointmentResponse> createAppointment(
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

    @PostMapping("/ai/haircut-suggestions")
    public ResponseEntity<HaircutSuggestionResponse> suggestHaircut(
            @Valid @RequestBody HaircutSuggestionRequest request,
            HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver.resolve(httpRequest);
        haircutAiRateLimiter.checkAllowed(clientIp);
        haircutAiRateLimiter.recordAttempt(clientIp);
        if (!haircutAiConcurrencyLimiter.tryAcquire()) {
            throw new TooManyRequestsException("Alta demanda de simulacion IA en este momento. Intenta nuevamente en unos segundos.");
        }
        try {
            return ResponseEntity.ok(haircutSuggestionService.suggestFromImage(request.imageDataUrl()));
        } finally {
            haircutAiConcurrencyLimiter.release();
        }
    }
}
