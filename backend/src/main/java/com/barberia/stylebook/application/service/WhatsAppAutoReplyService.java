package com.barberia.stylebook.application.service;

import com.barberia.stylebook.domain.entity.Appointment;
import com.barberia.stylebook.domain.enums.AppointmentStatus;
import com.barberia.stylebook.repository.AppointmentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class WhatsAppAutoReplyService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppAutoReplyService.class);
    private static final EnumSet<AppointmentStatus> REPLY_ELIGIBLE_STATUSES =
            EnumSet.of(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final int HTTP_CONNECT_TIMEOUT_MS = 5_000;
    private static final int HTTP_READ_TIMEOUT_MS = 5_000;
    private static final int MAX_COOLDOWN_CACHE_ENTRIES = 50_000;

    private final AppointmentRepository appointmentRepository;
    private final RestClient restClient;
    private final boolean enabled;
    private final String webhookVerifyToken;
    private final String webhookAppSecret;
    private final String phoneNumberId;
    private final String accessToken;
    private final int lookbackMinutes;
    private final int cooldownMinutes;
    private final ZoneId businessZone;
    private final Cache<String, OffsetDateTime> repliedAtByPhone;

    public WhatsAppAutoReplyService(
            AppointmentRepository appointmentRepository,
            @Value("${app.whatsapp.enabled:false}") boolean enabled,
            @Value("${app.whatsapp.webhook-verify-token:}") String webhookVerifyToken,
            @Value("${app.whatsapp.webhook-app-secret:}") String webhookAppSecret,
            @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
            @Value("${app.whatsapp.access-token:}") String accessToken,
            @Value("${app.whatsapp.lookback-minutes:90}") int lookbackMinutes,
            @Value("${app.whatsapp.cooldown-minutes:720}") int cooldownMinutes,
            @Value("${app.whatsapp.business-timezone:America/Argentina/Buenos_Aires}") String businessTimezone
    ) {
        this.appointmentRepository = appointmentRepository;
        this.restClient = RestClient.builder()
                .baseUrl("https://graph.facebook.com")
                .requestFactory(buildRequestFactory())
                .build();
        this.enabled = enabled;
        this.webhookVerifyToken = webhookVerifyToken == null ? "" : webhookVerifyToken.trim();
        this.webhookAppSecret = webhookAppSecret == null ? "" : webhookAppSecret.trim();
        this.phoneNumberId = phoneNumberId == null ? "" : phoneNumberId.trim();
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.lookbackMinutes = Math.max(5, lookbackMinutes);
        this.cooldownMinutes = Math.max(1, cooldownMinutes);
        this.businessZone = ZoneId.of(businessTimezone);
        this.repliedAtByPhone = Caffeine.newBuilder()
                .maximumSize(MAX_COOLDOWN_CACHE_ENTRIES)
                .expireAfterWrite(Duration.ofDays(2))
                .build();
    }

    public boolean isVerificationTokenValid(String token) {
        return !webhookVerifyToken.isBlank() && webhookVerifyToken.equals(token);
    }

    public boolean isWebhookSignatureValid(String payload, String signatureHeader) {
        if (!enabled) {
            return true;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }
        if (webhookAppSecret.isBlank()) {
            log.warn("WhatsApp webhook enabled but app secret is missing; rejecting webhook event.");
            return false;
        }

        String expected = "sha256=" + hmacSha256Hex(payload == null ? "" : payload, webhookAppSecret);
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = signatureHeader.trim().getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, providedBytes);
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
                    CompletableFuture.runAsync(() -> maybeReplyToClient(fromPhone));
                }
            }
        }
    }

    private boolean isMessagingConfigured() {
        return !phoneNumberId.isBlank() && !accessToken.isBlank();
    }

    private void maybeReplyToClient(String incomingPhoneDigits) {
        OffsetDateTime now = OffsetDateTime.now();
        if (isInCooldown(incomingPhoneDigits, now)) {
            return;
        }

        OffsetDateTime createdFrom = now.minusMinutes(lookbackMinutes);
        OffsetDateTime appointmentAfter = now.minusDays(1);
        Optional<Appointment> candidate = appointmentRepository
                .findRecentEligibleByClientPhoneNormalized(
                        REPLY_ELIGIBLE_STATUSES,
                        incomingPhoneDigits,
                        createdFrom,
                        appointmentAfter,
                        PageRequest.of(0, 1)
                )
                .stream()
                .findFirst();

        if (candidate.isEmpty()) {
            return;
        }

        Appointment appointment = candidate.get();
        String body = buildAutoReplyBody(appointment);
        sendTextMessage(incomingPhoneDigits, body);
        repliedAtByPhone.put(incomingPhoneDigits, now);
    }

    private boolean isInCooldown(String phoneDigits, OffsetDateTime now) {
        OffsetDateTime lastReplyAt = repliedAtByPhone.getIfPresent(phoneDigits);
        if (lastReplyAt == null) {
            return false;
        }
        return lastReplyAt.isAfter(now.minusMinutes(cooldownMinutes));
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

    private static String hmacSha256Hex(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo validar firma HMAC de WhatsApp", ex);
        }
    }

    private static SimpleClientHttpRequestFactory buildRequestFactory() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(HTTP_CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(HTTP_READ_TIMEOUT_MS);
        return factory;
    }
}
