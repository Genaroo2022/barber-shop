package com.barberia.stylebook.web;

import com.barberia.stylebook.application.service.BookingService;
import com.barberia.stylebook.repository.ServiceCatalogRepository;
import com.barberia.stylebook.web.dto.AppointmentResponse;
import com.barberia.stylebook.web.dto.CreateAppointmentRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicBookingController {

    private final BookingService bookingService;
    private final ServiceCatalogRepository serviceCatalogRepository;

    public PublicBookingController(BookingService bookingService, ServiceCatalogRepository serviceCatalogRepository) {
        this.bookingService = bookingService;
        this.serviceCatalogRepository = serviceCatalogRepository;
    }

    @PostMapping("/appointments")
    public ResponseEntity<AppointmentResponse> createAppointment(@Valid @RequestBody CreateAppointmentRequest request) {
        return ResponseEntity.ok(bookingService.create(request));
    }

    @GetMapping("/services")
    public ResponseEntity<List<Map<String, Object>>> listServices() {
        List<Map<String, Object>> items = serviceCatalogRepository.findAll().stream()
                .filter(s -> Boolean.TRUE.equals(s.getActive()))
                .map(s -> Map.<String, Object>of(
                        "id", s.getId(),
                        "name", s.getName(),
                        "price", s.getPrice(),
                        "durationMinutes", s.getDurationMinutes()
                ))
                .toList();
        return ResponseEntity.ok(items);
    }
}
