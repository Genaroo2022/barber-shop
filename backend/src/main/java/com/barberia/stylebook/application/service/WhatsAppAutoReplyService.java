package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WhatsAppAutoReplyService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppAutoReplyService.class);
    private static final EnumSet<AppointmentStatus> REPLY_ELIGIBLE_STATUSES =
            EnumSet.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final AppointmentRepository appointmentRepository;
    private final RestClient restClient;
    private final boolean enabled;
    private final String webhookVerifyToken;
    private final String phoneNumberId;
    private final String accessToken;
    private final int lookbackMinutes;
    private final int cooldownMinutes;
    private final ZoneId businessZone;
    private final Map<String, OffsetDateTime> repliedAtByPhone = new ConcurrentHashMap<>();

    public WhatsAppAutoReplyService(
            AppointmentRepository appointmentRepository,
            @Value("${app.whatsapp.enabled:false}") boolean enabled,
            @Value("${app.whatsapp.webhook-verify-token:}") String webhookVerifyToken,
            @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${app.whatsapp.access-token:}") String accessToken,
            @Value("${app.whatsapp.lookback-minutes:90}") int lookbackMinutes,
            @Value("${app.whatsapp.cooldown-minutes:720}") int cooldownMinutes,
            @Value("${app.whatsapp.business-timezone:America/Argentina/Buenos_Aires}") String businessTimezone
    ) {
        this.appointmentRepository = appointmentRepository;
        this.restClient = RestClient.builder()
                .baseUrl("https://graph.facebook.com")
                .build();
        this.enabled = enabled;
        this.webhookVerifyToken = webhookVerifyToken == null ? "" : webhookVerifyToken.trim();
        this.phoneNumberId = phoneNumberId == null ? "" : phoneNumberId.trim();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.lookbackMinutes = Math.max(5, lookbackMinutes);
        this.cooldownMinutes = Math.max(1, cooldownMinutes);
        this.businessZone = ZoneId.of(businessTimezone);
    }

    public boolean isVerificationTokenValid(String token) {
        return !webhookVerifyToken.isBlank() && webhookVerifyToken.equals(token);
    }

    public void processIncomingWebhook(JsonNode payload) {
        if (!enabled || !isMessagingConfigured()) {
            return;
        }

        JsonNode entries = payload.path("entry");
        if (!entries.isArray()) {
            return;
        }

        for (JsonNode entry : entries) {
            JsonNode changes = entry.path("changes");
            if (!changes.isArray()) {
                continue;
            }
            for (JsonNode change : changes) {
                JsonNode messages = change.path("value").path("messages");
                if (!messages.isArray()) {
                    continue;
                }
                for (JsonNode message : messages) {
                    String fromPhone = normalizeDigits(message.path("from").asText(""));
                    if (fromPhone.isBlank()) {
                        continue;
                    }
                    maybeReplyToClient(fromPhone);
                }
            }
        }
    }

    private boolean isMessagingConfigured() {
        return !phoneNumberId.isBlank() && !accessToken.isBlank();
    }

    private void maybeReplyToClient(String incomingPhoneDigits) {
        if (isInCooldown(incomingPhoneDigits)) {
            return;
        }

        OffsetDateTime createdFrom = OffsetDateTime.now().minusMinutes(lookbackMinutes);
        Optional<Appointment> candidate = appointmentRepository
                .findRecentByStatusesAndCreatedAtAfter(REPLY_ELIGIBLE_STATUSES, createdFrom)
                .stream()
                .filter(appointment -> normalizeDigits(appointment.getClient().getPhone()).equals(incomingPhoneDigits))
                .filter(appointment -> appointment.getAppointmentAt().isAfter(OffsetDateTime.now().minusDays(1)))
                .findFirst();

        if (candidate.isEmpty()) {
            return;
        }

        Appointment appointment = candidate.get();
        String body = buildAutoReplyBody(appointment);
        sendTextMessage(incomingPhoneDigits, body);
        repliedAtByPhone.put(incomingPhoneDigits, OffsetDateTime.now());
    }

    private boolean isInCooldown(String phoneDigits) {
        OffsetDateTime lastReplyAt = repliedAtByPhone.get(phoneDigits);
        if (lastReplyAt == null) {
            return false;
        }
        return lastReplyAt.isAfter(OffsetDateTime.now().minusMinutes(cooldownMinutes));
    }

    private String buildAutoReplyBody(Appointment appointment) {
        String clientName = appointment.getClient().getName();
        String serviceName = appointment.getService().getName();
        String date = appointment.getAppointmentAt().atZoneSameInstant(businessZone).format(DATE_FORMATTER);
        String time = appointment.getAppointmentAt().atZoneSameInstant(businessZone).format(TIME_FORMATTER);

        return "Hola " + clientName + ". Recibimos tu mensaje y tu turno de "
                + serviceName + " para el " + date + " a las " + time
                + " hs quedo registrado. Te esperamos.";
    }

    private void sendTextMessage(String toPhoneDigits, String body) {
        try {
            restClient.post()
                    .uri("/v22.0/{phoneNumberId}/messages", phoneNumberId)
                    .header("Authorization", "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "messaging_product", "whatsapp",
                            "to", toPhoneDigits,
                            "type", "text",
                            "text", Map.of(
                                    "preview_url", false,
                                    "body", body
                            )
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("No se pudo enviar auto-respuesta de WhatsApp para {}: {}", toPhoneDigits, ex.getMessage());
        }
    }

    private static String normalizeDigits(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.replaceAll("\\D", "");
    }
}
